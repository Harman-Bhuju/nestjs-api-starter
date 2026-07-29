import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './config/database/typeorm-options';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default new DataSource(buildDataSourceOptions())

// npm run migration:run
// npm run migration:revert
// npm run migration:show
// npm run migration:run:prod
// npm run migration:revert:prod

// npm run migration:create -- src/core/CONFIG/migrations/AddUsersTable
// npm run migration:generate -- src/core/CONFIG/migrations/AddUsersTable
