import { Module } from '@nestjs/common';
import { AppController } from './modules/app/app.controller';
import { AppService } from './modules/app/app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ormConfig from './config/database/orm.config';
import ormConfigProd from './config/database/orm.config.prod';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

