import * as path from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { User } from 'src/modules/user/entities/user.entity';
import { Role } from 'src/modules/auth/entities/role.entity';
import { Authorization } from 'src/modules/auth/entities/authorization.entity';
import { RefreshToken } from 'src/modules/auth/entities/refresh-token.entity';
import { File } from 'src/modules/file/entities/file.entity';

function resolveDatabaseRoot(): string {
  return process.env.NODE_ENV === 'production' ? 'dist' : 'src';
}

const entities = [User, Role, Authorization, RefreshToken, File];

function buildBaseTypeOrmOptions(): TypeOrmModuleOptions {
  const sslEnabled = process.env.DB_SSL === 'true';
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging:
      process.env.DB_LOGGING === 'true'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
    maxQueryExecutionTime: 200,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    extra: {
      // If SSL is enabled, add this property. If it isn't, don't add the property.
      ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
      family: 4, // force IPv4
      max: 10, // 10 db connection at max
    },
    autoLoadEntities: false, // always false for production
    entities: entities,
  };
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return buildBaseTypeOrmOptions();
}

export function buildMigrationTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    ...buildBaseTypeOrmOptions(),
    migrations: [
      path.resolve(
        process.cwd(),
        `${resolveDatabaseRoot()}/config/database/migrations/*{.ts,.js}`,
      ),
    ],
    migrationsRun: false,
  };
}

export function buildDataSourceOptions(): DataSourceOptions {
  const { autoLoadEntities: _autoloadentities, ...options } =
    buildMigrationTypeOrmOptions();
  return options as DataSourceOptions;
}
