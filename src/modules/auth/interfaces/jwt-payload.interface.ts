import { Role } from '../../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  /** FK into the `role` table — this is what AuthorizationGuard checks permissions against, no DB lookup needed. */
  roleId: string;
  /** Human-readable role name, kept for logging/error messages and any client that wants it without a lookup. */
  role: Role;
  tokenVersion: number;
}
