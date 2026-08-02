import { JwtPayload } from './jwt-payload.interface';

export interface RefreshTokenPayload extends JwtPayload {
  tokenType: 'refresh';
  jti: string;
}
