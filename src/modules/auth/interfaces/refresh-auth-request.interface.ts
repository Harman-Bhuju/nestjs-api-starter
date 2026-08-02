import { Request } from 'express';
import { RefreshTokenRequestUser } from './refresh-token-request-user.interface';

/** Request shape after RefreshTokenGuard has run. */
export interface RefreshAuthRequest extends Request {
  user: RefreshTokenRequestUser;
}
