import { JwtPayload } from './jwt-payload.interface';

export interface AccessTokenPayload extends JwtPayload {
  tokenType: 'access';
}
