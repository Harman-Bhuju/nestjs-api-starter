import { Request } from 'express';
import { AccessTokenPayload } from '../../modules/auth/interfaces/access-token-payload.interface';

/** Request shape after AccessTokenGuard has run and attached `user`. */
export interface AuthRequest extends Request {
  user: AccessTokenPayload;
}
