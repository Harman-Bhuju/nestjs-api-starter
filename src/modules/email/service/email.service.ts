import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { OtpUtils } from 'src/common/utils/otp.utils';
import { buildOtpEmailHtml } from '../templates/otp-email.template';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.fromEmail = this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
    // One brand name everywhere — the original mixed "Location Track" and
    // "NextStep Inventory" across different emails, which looks like a bug
    // (and is confusing) to anyone who receives both.
    this.appName = this.configService.get<string>('APP_NAME', 'NestJS Basic Auth');
  }

  async sendVerificationOtp(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const html = buildOtpEmailHtml({
      appName: this.appName,
      recipientName: name,
      otp,
      eyebrow: 'Email Verification',
      intro: `Welcome to ${this.appName}! Use the code below to verify your email address and complete your registration.`,
      accentColor: '#22c55e',
      warning:
        'Never share this OTP with anyone. If you did not create an account, please ignore this email.',
      validityMinutes: OtpUtils.OTP_VALIDITY_MINUTES,
    });

    await this.send(
      to,
      'Verify Your Email - Your OTP Code',
      html,
      'verification OTP',
    );
  }

  async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const html = buildOtpEmailHtml({
      appName: this.appName,
      recipientName: name,
      otp,
      eyebrow: 'Password Reset',
      intro:
        'You requested a password reset. Use the code below to verify your identity.',
      accentColor: '#1A78D6',
      warning:
        'Do not share this OTP with anyone. If you did not request a password reset, please ignore this email.',
      validityMinutes: OtpUtils.OTP_VALIDITY_MINUTES,
    });

    await this.send(
      to,
      'Your Password Reset OTP',
      html,
      'password reset OTP',
    );
  }

  /**
   * Single send path — every method above builds HTML and calls this.
   *
   * On failure: logs the REAL error (Resend's message, stack trace, etc.)
   * server-side for debugging, but throws only `userFacingMessage` to the
   * caller. Callers (AuthService) let this propagate so registration/resend
   * fails loudly instead of silently — see AuthService for how that failure
   * gets paired with a DB transaction rollback so no orphaned user is left
   * behind. Never bubble up the provider's own error text: it can leak
   * infra details (which provider, API key issues, etc.) to the client.
   */
  private async send(
    to: string,
    subject: string,
    html: string,
    label: string,
  ): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: `${this.appName} <${this.fromEmail}>`,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send ${label} to ${to}: ${error.message}`);
        throw new InternalServerErrorException('Failed to send email.');
      }

      this.logger.log(`Sent ${label} to ${to}`);
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`Exception sending ${label} to ${to}`, err as Error);
      throw new InternalServerErrorException('Failed to send email.');
    }
  }
}
