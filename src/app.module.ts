import { Module } from '@nestjs/common';
import { AppController } from './modules/app/app.controller';
import { AppService } from './modules/app/app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ormConfig from './config/database/orm.config';
import ormConfigProd from './config/database/orm.config.prod';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PaymentModule } from './modules/payment/payment.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { EmailModule } from './modules/email/email.module';
import { FileuploadModule } from './modules/fileupload/fileupload.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccessTokenGuard } from './modules/auth/guards/access-token.guard';
import { AuthorizationGuard } from './modules/auth/guards/authorization.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [ormConfig, ormConfigProd],
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configKey =
          process.env.NODE_ENV === 'production'
            ? 'orm.config.prod'
            : 'orm.config';

        return configService.getOrThrow<TypeOrmModuleOptions>(configKey);
      },
    }),
    // Sane global default; individual auth endpoints (login, OTP) set tighter
    // limits with @Throttle(...) since brute-force risk differs per route.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    MessagingModule,
    PaymentModule,
    SubscriptionsModule,
    AuthModule,
    UserModule,
    EmailModule,
    FileuploadModule,
  ],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Order matters: authentication must run before authorization.
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
  controllers: [AppController],
})
export class AppModule {}
