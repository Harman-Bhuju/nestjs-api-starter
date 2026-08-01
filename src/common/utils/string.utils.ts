import { randomBytes } from 'crypto';

export class StringUtils {
  private static readonly ALPHANUMERIC =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  /** Cryptographically-random alphanumeric id — safe to use as a primary key. */
  static generateRandomAlphaNumeric(length: number): string {
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.ALPHANUMERIC[bytes[i] % this.ALPHANUMERIC.length];
    }
    return result;
  }
}
