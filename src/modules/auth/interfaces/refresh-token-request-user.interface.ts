import { RefreshTokenPayload } from './refresh-token-payload.interface';

export interface RefreshTokenRequestUser extends RefreshTokenPayload {
  rawRefreshToken: string;
}
