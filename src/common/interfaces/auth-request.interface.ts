import { Request } from 'express';
import { AccessTokenPayload } from './access-token-payload.interface';

/** Request shape after AccessTokenGuard has run and attached `user`. */
export interface AuthRequest extends Request {
  user: AccessTokenPayload;
}
