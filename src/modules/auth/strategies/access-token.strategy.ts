import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { AccessTokenPayload } from 'src/modules/auth/interfaces/access-token-payload.interface';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Runs on every authenticated request. We re-check tokenVersion against
   * the DB (not just trust the JWT claim) so that "logout all devices"
   * takes effect immediately instead of waiting for the token to expire.
   */
  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(
        'Session invalidated. Please login again',
      );
    }

    return payload;
  }
}
