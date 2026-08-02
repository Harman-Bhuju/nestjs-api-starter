import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CookieOptions, Request, Response } from 'express';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { StringUtils } from 'src/common/utils/string.utils';
import { User } from 'src/modules/user/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokenPayload } from 'src/common/interfaces/refresh-token-payload.interface';
import { AccessTokenPayload } from 'src/common/interfaces/access-token-payload.interface';
import { DecodedRefreshTokenPayload } from 'src/common/interfaces/decoded-refresh-token-payload.interface';
import { TokenPair } from 'src/common/interfaces/token-pair.interface';

/**
 * Single place that owns: signing tokens, persisting/rotating hashed refresh
 * tokens, and the httpOnly refresh-token cookie. Previously this logic (and
 * the cookie options object in particular) was copy-pasted across login,
 * refresh, and logout in the controller — consolidating it here means the
 * cookie policy can only drift in one place.
 */
@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private buildPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }

  /** Issues a fresh access+refresh pair and persists the refresh token's hash. */
  async issueTokens(
    user: User,
  ): Promise<TokenPair> {
    const payload = this.buildPayload(user);
    const tokenId = StringUtils.generateRandomAlphaNumeric(32);

    const accessPayload: AccessTokenPayload = {
      ...payload,
      tokenType: 'access',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'ACCESS_TOKEN_EXPIRY',
      ) as any,
    });

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiry = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRY',
    );

    const refreshPayload: RefreshTokenPayload = {
      ...payload,
      tokenType: 'refresh',
      jti: tokenId,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiry as any,
    });

    const decoded = this.jwtService.verify<DecodedRefreshTokenPayload>(
      refreshToken,
      {
        secret: refreshSecret,
      },
    );

    const hashToken = await bcrypt.hash(
      refreshToken,
      this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10),
    );

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        id: tokenId,
        hashToken,
        expiryAt: new Date(decoded.exp * 1000),
        revoked: false,
        user,
      }),
    );

    return { accessToken, refreshToken };
  }

  /** Verifies + rotates a refresh token, returning a new pair. Deletes the old one either way. */
  async rotateRefreshToken(
    refreshTokenStr: string,
  ): Promise<TokenPair> {
    const decoded = this.verifyRefreshTokenJwt(refreshTokenStr);

    const savedToken = await this.refreshTokenRepository.findOne({
      where: { id: decoded.jti },
      relations: {
        user: true,
      },
    });

    if (!savedToken) {
      throw new UnauthorizedException('Session not found. Please login again');
    }
    if (savedToken.revoked) {
      throw new UnauthorizedException('Session revoked. Please login again');
    }
    if (savedToken.expiryAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.delete(savedToken.id);
      throw new UnauthorizedException(
        'Refresh token expired. Please login again',
      );
    }

    const isMatch = await bcrypt.compare(refreshTokenStr, savedToken.hashToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = savedToken.user;
    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException(
        'Session invalidated. Please login again',
      );
    }

    await this.refreshTokenRepository.delete(savedToken.id);
    return this.issueTokens(user);
  }

  async revokeRefreshToken(refreshTokenStr: string): Promise<void> {
    let decoded: DecodedRefreshTokenPayload;
    try {
      decoded = this.verifyRefreshTokenJwt(refreshTokenStr);
    } catch {
      // Already invalid/expired — nothing to revoke, treat logout as a no-op success.
      return;
    }
    await this.refreshTokenRepository.delete({ id: decoded.jti });
  }

  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ user: { id: userId } as any });
  }

  private verifyRefreshTokenJwt(token: string): DecodedRefreshTokenPayload {
    try {
      const decoded = this.jwtService.verify<DecodedRefreshTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
      if (decoded.tokenType !== 'refresh' || !decoded.jti || !decoded.sub) {
        throw new Error('malformed');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Cookie handling (web clients only; mobile clients get the token in the JSON body) ──

  private cookieOptions(req: Request): CookieOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    return {
      httpOnly: true,
      secure:
        nodeEnv === 'development'
          ? req.secure
          : this.configService.get<boolean>('COOKIE_SECURE', false),
      sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }

  setRefreshCookie(req: Request, res: Response, refreshToken: string): void {
    if (req.headers['x-client-type'] !== 'web') return;
    res.cookie('refreshToken', refreshToken, this.cookieOptions(req));
  }

  /** Only re-sets the cookie if the request actually came in with one (i.e. it's a web client). */
  refreshCookieIfPresent(
    req: Request,
    res: Response,
    refreshToken: string,
  ): void {
    if (!req.cookies?.refreshToken) return;
    res.cookie('refreshToken', refreshToken, this.cookieOptions(req));
  }

  clearRefreshCookie(req: Request, res: Response): void {
    if (!req.cookies?.refreshToken) return;
    res.clearCookie('refreshToken', this.cookieOptions(req));
  }
}
