import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { Role as RoleEnum } from '../../src/common/enums/role.enum';
import { Role } from '../../src/modules/auth/entities/role.entity';
import { Authorization } from '../../src/modules/auth/entities/authorization.entity';
import { buildDataSourceOptions } from '../config/database/typeorm-options';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GET = 'GET';
const POST = 'POST';
const PUT = 'PUT';
const PATCH = 'PATCH';
const DELETE = 'DELETE';
const FULL_ACCESS = [GET, POST, PUT, PATCH, DELETE];

// Reuses the same DataSourceOptions the app and `npm run migration:*`
// commands use (see src/data-source.ts) instead of hand-rolling a second,
// easily-drifting copy of the connection config here.
const AppDataSource = new DataSource(buildDataSourceOptions());

async function upsertRole(
  dataSource: DataSource,
  roleName: RoleEnum,
): Promise<Role> {
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

function permission(
  role: Role,
  path: string,
  methods: string[],
): Authorization {
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

    permission(role, '/subscriptions/plans', [GET, POST]),
  ];
}

function getUserPermissions(role: Role): Authorization[] {
  return [
    permission(role, '/auth/logout-all-devices', [POST]),
    permission(role, '/users/me', FULL_ACCESS),
    permission(role, '/files/profile', FULL_ACCESS),
    permission(role, '/files/documents', FULL_ACCESS),
    permission(role, '/files/documents/:id', FULL_ACCESS),

    permission(role, '/subscriptions/plans', [GET]),
    permission(role, '/subscriptions/purchase', [POST]),
    permission(role, '/subscriptions/me', [GET]),
    permission(role, '/subscriptions/me/current-tier', [GET]),
    permission(role, '/payment', [POST]),
    permission(role, '/payment/status/:transactionUuid', [GET]),
  ];
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log(
      "Data source initialized. Run migrations before seeding if you haven't.",
    );

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
