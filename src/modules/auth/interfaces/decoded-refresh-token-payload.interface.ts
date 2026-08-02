import { RefreshTokenPayload } from './refresh-token-payload.interface';

export interface DecodedRefreshTokenPayload extends RefreshTokenPayload {
  exp: number;
  iat: number;
}
