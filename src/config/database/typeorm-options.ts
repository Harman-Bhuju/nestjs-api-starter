import * as path from "path";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";

function resolveDatabaseRoot(): string {
    return process.env.NODE_ENV === 'production' ? 'dist' : 'src';
}

function buildBaseTypeOrmOptions(): TypeOrmModuleOptions {
    const sslEnabled = process.env.DB_SSL === 'true';
    const entities = [
        path.resolve(
            process.cwd(),
            `${resolveDatabaseRoot()}/modules/**/*.entity{.ts,.js}`,
        ),
    ]
    return {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.DB_LOGGING === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
        maxQueryExecutionTime: 200,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        extra: {
            // If SSL is enabled, add this property. If it isn't, don't add the property.
            ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
            //ipv4
            family: 4,
            // 10 db connection at max
            max: 10,
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
            path.resolve(process.cwd(),
                `${resolveDatabaseRoot()}/config/database/migrations/*{.ts,.js}`),
        ],
        migrationsRun: false
    }
}

export function buildDataSourceOptions(): DataSourceOptions {
    const { autoLoadEntities: _autoloadentities, ...options } = buildMigrationTypeOrmOptions();
    return options as DataSourceOptions;
}
