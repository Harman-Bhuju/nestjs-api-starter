import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { Role as RoleEnum } from '../../src/common/enums/role.enum';
import { StringUtils } from '../../src/common/utils/string.utils';
import { User } from '../../src/modules/user/entities/user.entity';
import { Role } from '../../src/modules/auth/entities/role.entity';
import { Authorization } from '../../src/modules/auth/entities/authorization.entity';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const FULL_ACCESS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const READ_ONLY = ['GET'];

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User, Role, Authorization, RefreshToken],
  synchronize: false,
  logging: false,
});

async function upsertRole(dataSource: DataSource, roleName: RoleEnum): Promise<Role> {
  const repo = dataSource.getRepository(Role);
  let role = await repo.findOne({ where: { role: roleName } });
  if (!role) {
    role = repo.create({ id: Role.generateId(4), role: roleName });
    await repo.save(role);
    console.log(`Created role: ${roleName}`);
  } else {
    console.log(`Role already exists: ${roleName}`);
  }
  return role;
}

function permission(role: Role, path: string, methods: string[]): Authorization {
  const auth = new Authorization();
  auth.id = Authorization.generateId(4);
  auth.role = role;
  auth.path = path;
  auth.methods = methods;
  return auth;
}

/**
 * Baseline route permissions. Extend this per role as you add controllers —
 * anything not listed here is denied by AuthorizationGuard by default.
 */
function getAdminPermissions(role: Role): Authorization[] {
  return [
    permission(role, '/users', FULL_ACCESS),
    permission(role, '/users/*', FULL_ACCESS),
    permission(role, '/files/*', FULL_ACCESS),
  ];
}

function getUserPermissions(role: Role): Authorization[] {
  return [
    permission(role, '/users/me', FULL_ACCESS),
    permission(role, '/files/profile', FULL_ACCESS),
    permission(role, '/files/documents', FULL_ACCESS),
    permission(role, '/files/documents/:id', FULL_ACCESS),
  ];
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Data source initialized. Run migrations before seeding if you haven\'t.');

    const adminRole = await upsertRole(AppDataSource, RoleEnum.ADMIN);
    const userRole = await upsertRole(AppDataSource, RoleEnum.USER);

    const authRepo = AppDataSource.getRepository(Authorization);
    // Clear existing permissions for these roles so re-running the seed is idempotent.
    await authRepo.delete({ role: { id: adminRole.id } });
    await authRepo.delete({ role: { id: userRole.id } });

    const authorizations = [
      ...getAdminPermissions(adminRole),
      ...getUserPermissions(userRole),
    ];

    await authRepo.save(authorizations);
    console.log(`Seeded ${authorizations.length} authorization rules.`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

seed();
