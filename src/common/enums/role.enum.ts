/**
 * Generic starting role set. Add/remove roles here as your domain needs.
 * Roles are seeded into the `role` table by database/seed/seed-roles.ts,
 * and route permissions are attached to each role via the `authorization` table
 * (see AuthorizationService) — so adding a role here does NOT automatically
 * grant it any route access.
 */
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
