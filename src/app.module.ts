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
        const configKey = process.env.NODE_ENV === 'production'
          ? 'orm.config.prod'
          : 'orm.config';

        return configService.getOrThrow<TypeOrmModuleOptions>(configKey);
      },
    }),

    MessagingModule,

    PaymentModule,

    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

