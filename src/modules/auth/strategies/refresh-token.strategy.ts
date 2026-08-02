import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RefreshTokenPayload } from 'src/modules/auth/interfaces/refresh-token-payload.interface';
import { RefreshTokenRequestUser } from 'src/modules/auth/interfaces/refresh-token-request-user.interface';

function extractRefreshToken(req: Request): string | null {
  // Web clients: httpOnly cookie. Mobile/native clients: request body.
  return req.cookies?.refreshToken ?? req.body?.refreshToken ?? null;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): RefreshTokenRequestUser {
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const rawRefreshToken = extractRefreshToken(req);
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return { ...payload, rawRefreshToken };
  }
}
