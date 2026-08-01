import { randomInt } from 'crypto';

/**
 * Utility methods for generating and validating One-Time Passwords (OTPs).
 *
 * Responsibilities:
 * - Generate cryptographically secure OTPs.
 * - Calculate OTP expiry times.
 * - Check OTP expiration.
 * - Manage failed attempt limits.
 * - Calculate and validate account lock periods.
 */
export class OtpUtils {
  static readonly OTP_DIGITS = 6;
  static readonly OTP_VALIDITY_MINUTES = 10;
  static readonly MAX_ATTEMPTS = 3;
  static readonly LOCK_DURATION_MINUTES = 15;

  // Number of milliseconds in one minute.
  private static readonly MINUTE_IN_MS = 60_000;

  // Number of milliseconds in one second.
  private static readonly SECOND_IN_MS = 1_000;

  /**
   * Generates a cryptographically secure numeric OTP.
   *
   * @returns A zero-padded OTP string with {@link OTP_DIGITS} digits.
   *
   * @example
   * const otp = OtpUtils.generateOtp();
   * // "042781"
   */
  static generateOtp(): string {
    const max = 10 ** this.OTP_DIGITS;

    return randomInt(0, max).toString().padStart(this.OTP_DIGITS, '0');
  }

  /**
   * Calculates the expiration time for a newly generated OTP.
   *
   * @returns The date and time when the OTP expires.
   */
  static getOtpExpiryTime(): Date {
    return new Date(Date.now() + this.OTP_VALIDITY_MINUTES * this.MINUTE_IN_MS);
  }

  /**
   * Determines whether an OTP has expired.
   *
   * @param expiryAt The OTP expiration timestamp.
   * @returns `true` if the OTP has expired or no expiry time exists; otherwise `false`.
   */
  static isOtpExpired(expiryAt: Date | null): boolean {
    if (!expiryAt) {
      return true;
    }

    return Date.now() >= expiryAt.getTime();
  }

  /**
   * Determines whether the maximum number of failed OTP attempts has been reached.
   *
   * @param attempts Current failed attempt count.
   * @returns `true` if the maximum attempts have been reached; otherwise `false`.
   */
  static isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.MAX_ATTEMPTS;
  }

  /**
   * Calculates the account lock expiration time.
   *
   * @returns The date and time when the account lock expires.
   */
  static getLockUntilTime(): Date {
    return new Date(
      Date.now() + this.LOCK_DURATION_MINUTES * this.MINUTE_IN_MS,
    );
  }

  /**
   * Determines whether an account is currently locked.
   *
   * @param lockedUntil The account lock expiration timestamp.
   * @returns `true` if the account is currently locked; otherwise `false`.
   */
  static isAccountLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) {
      return false;
    }

    return Date.now() < lockedUntil.getTime();
  }

  /**
   * Returns the remaining account lock time in seconds.
   *
   * @param lockedUntil The account lock expiration timestamp.
   * @returns Remaining lock time in seconds, or `0` if the account is not locked.
   */
  static getRemainingLockTime(lockedUntil: Date | null): number {
    // just for type validation even though below function isAccountLocked() guarantees lockedUntil cannot be null
    if (!lockedUntil) {
      return 0;
    }

    if (!this.isAccountLocked(lockedUntil)) {
      return 0;
    }

    return Math.ceil((lockedUntil.getTime() - Date.now()) / this.SECOND_IN_MS);
  }
}
