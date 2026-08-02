import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Authorization } from './entities/authorization.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenService } from './service/token.service';
import { AuthorizationService } from './service/authorization.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Authorization, RefreshToken]),
    UserModule,
    EmailModule,

    // JwtModule's default sign options are only used as a fallback — TokenService
    // passes explicit secret/expiresIn per token type (access vs refresh) anyway.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    AuthorizationService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthorizationService, TypeOrmModule],
})
export class AuthModule {}
