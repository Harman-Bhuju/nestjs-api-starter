import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from 'src/common/decorators/public.decorator';
import type { RefreshAuthRequest } from 'src/modules/auth/interfaces/refresh-auth-request.interface';
import { errorExample } from 'src/common/dto/error-response.dto';

import { AuthService } from '../service/auth.service';
import { TokenService } from '../service/token.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { LoginDto } from '../dto/login.dto';
import { OtpVerifyDto } from '../dto/otp-verify.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } }) // Register: Max 5 requests every 10 minutes
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new, unverified user account and emails a 6-digit OTP to confirm ownership of the address. The account cannot log in until the OTP is confirmed via POST /auth/verify-otp. The new user is always created with the baseline USER role — there is no way to self-register as ADMIN through this endpoint.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({
    description: 'Registration successful. OTP sent to email.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Registration successful! OTP sent to jane@example.com. Valid for 10 minutes.',
        },
        userId: { type: 'string', example: 'aB3dE9fG' },
        email: { type: 'string', example: 'jane@example.com' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'One or more fields failed validation (e.g. password too weak, contactNumber not 10 digits, invalid gender). The global ValidationPipe is not configured with a custom errorHttpStatusCode, so class-validator failures surface as 400, not 422.',
    ...errorExample(400, [
      'password must be longer than or equal to 8 and shorter than or equal to 30 characters',
      'Contact number must be exactly 10 digits',
    ]),
  })
  @ApiConflictResponse({
    description: 'A user with this email is already registered.',
    ...errorExample(409, 'Email jane@example.com is already registered'),
  })
  @ApiTooManyRequestsResponse({
    description:
      'Rate limit exceeded (max 5 requests per 10 minutes per client).',
    ...errorExample(429, 'ThrottlerException: Too Many Requests'),
  })
  @ApiInternalServerErrorResponse({
    description:
      'Either the baseline USER role has not been seeded yet, or the account was created but the verification email could not be sent — in the latter case the whole registration is rolled back (transaction), so the user does not end up half-created.',
    ...errorExample(
      500,
      "Registration could not be completed because we couldn't send the verification email. Please try again.",
    ),
  })
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 10 * 60_000 } }) // Verify OTP: Max 15 requests every 10 minutes
  @ApiOperation({
    summary: 'Verify a 6-digit OTP',
    description:
      "Confirms the OTP sent by /auth/register (email verification) or /auth/send-otp (forgot-password). Behavior depends on which flow the account is currently in: if the account hasn't verified its email yet, this completes email verification and returns a confirmation payload (email, name, role, userId) — it does NOT log the user in or issue any tokens; the client must call POST /auth/login separately. If the account is already verified, this is the forgot-password flow and only marks the OTP as consumed — call /auth/change-password next. Locks the account for 15 minutes after 3 incorrect attempts.",
  })
  @ApiBody({ type: OtpVerifyDto })
  @ApiOkResponse({
    description:
      "OTP verified. For the registration flow, returns a confirmation object with the verified account's basic details (no tokens are issued here). For the forgot-password flow, returns just a confirmation message.",
    schema: {
      oneOf: [
        {
          type: 'object',
          description: 'Registration (email verification) flow.',
          properties: {
            message: {
              type: 'string',
              example: 'Email verified successfully',
            },
            email: { type: 'string', example: 'jane@example.com' },
            name: { type: 'string', example: 'Jane Doe' },
            role: { type: 'string', example: 'USER' },
            userId: { type: 'string', example: 'aB3dE9fG' },
          },
        },
        {
          type: 'object',
          description: 'Forgot-password flow.',
          properties: {
            message: {
              type: 'string',
              example:
                'OTP verified successfully. You can now change your password.',
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'Either a request-validation failure (email not a valid address, or otp not exactly 6 characters), or a business-rule failure: OTP is wrong, expired, already used, the email is already verified, or the account is temporarily locked from too many failed attempts.',
    ...errorExample(400, 'Invalid OTP. 2 attempts remaining.'),
  })
  @ApiNotFoundResponse({
    description: 'No account exists for the given email.',
    ...errorExample(404, 'User not found'),
  })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } }) // Send/Resend OTP: Max 5 requests every 10 minutes
  @ApiOperation({
    summary: 'Send/resend an OTP',
    description:
      "Used for both email verification (resending a lost/expired registration OTP) and starting the forgot-password flow. Always returns the same generic success message whether or not the email is registered, to avoid leaking which emails have accounts — check your inbox either way. Silently a no-op if the email doesn't exist.",
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiOkResponse({
    description:
      'Generic success message. Always returned, regardless of whether the email exists.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'If an account exists for jane@example.com, an OTP has been sent. Valid for 10 minutes.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'email is not a valid email address.',
    ...errorExample(400, ['email must be an email']),
  })
  @ApiTooManyRequestsResponse({
    description:
      'Rate limit exceeded (max 5 requests per 10 minutes per client).',
    ...errorExample(429, 'ThrottlerException: Too Many Requests'),
  })
  @ApiInternalServerErrorResponse({
    description:
      'The account exists and OTP fields were updated, but the OTP email itself failed to send; the DB update is rolled back so the previous (still-valid) OTP is not silently invalidated.',
    ...errorExample(
      500,
      'We could not send the OTP at this time. Please try again.',
    ),
  })
  @Post('send-otp')
  async sendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } }) // Change Password: Max 5 requests every 10 minutes
  @ApiOperation({
    summary: 'Change password after OTP verification',
    description:
      'Sets a new password for the forgot-password flow. Requires that /auth/verify-otp was already successfully called for this email (the "OTP verified" flag is single-use and is cleared once this succeeds). Also revokes every existing session for the account (equivalent to logout-all-devices), so any device currently logged in will need to log in again.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Either a DTO validation failure (password too short/weak, confirmPassword missing, email invalid), or a business-rule failure: password and confirmPassword do not match, or OTP was never verified for this email.',
    ...errorExample(
      400,
      'OTP not verified. Please verify OTP before changing password',
    ),
  })
  @ApiNotFoundResponse({
    description: 'No account exists for the given email.',
    ...errorExample(404, 'User not found'),
  })
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // Login: Max 10 requests every 1 minute
  @ApiOperation({
    summary: 'Login with email + password',
    description:
      'Authenticates a user and issues a new access/refresh token pair. The refresh token is also set as an httpOnly cookie for web clients (mobile/native clients should use the refreshToken field from the JSON body instead). Fails if the email is unverified or the account is temporarily locked from too many failed OTP attempts.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful.', type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'email is not a valid email address, or password is empty.',
    ...errorExample(400, ['email must be an email']),
  })
  @ApiUnauthorizedResponse({
    description:
      'Wrong email/password, email not yet verified, or account temporarily locked.',
    ...errorExample(401, 'Invalid email or password'),
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded (max 10 requests per minute per client).',
    ...errorExample(429, 'ThrottlerException: Too Many Requests'),
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.tokenService.setRefreshCookie(req, res, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } }) // Refresh Token: Max 60 requests every 1 minute
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Rotate the refresh token for a new access+refresh pair',
    description:
      'Exchanges a valid, unexpired refresh token for a brand-new access+refresh pair; the old refresh token is invalidated immediately (rotation), so it cannot be reused. Web clients: the refresh token is read from the httpOnly cookie automatically — no body needed. Mobile/native clients: send { "refreshToken": "..." } in the body. Fails if the token was already used, revoked (e.g. via logout), expired, or if the account\'s tokenVersion has since been bumped (logout-all-devices, password change).',
  })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({
    description: 'New token pair issued.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token missing, malformed, expired, already rotated/revoked, or session invalidated.',
    ...errorExample(401, 'Session not found. Please login again'),
  })
  @Post('refresh-token')
  async refreshToken(
    @Req() req: RefreshAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshAccessToken(
      req.user.rawRefreshToken,
    );
    this.tokenService.refreshCookieIfPresent(req, res, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // Logout: Max 30 requests every 1 minute
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Logout the current device/session',
    description:
      'Revokes only the refresh token used in this request (this one device/session). Other logged-in devices are unaffected — use POST /auth/logout-all-devices for that. Guarded by the same refresh-token check as /auth/refresh-token, so a missing, malformed, or expired refresh token is rejected with 401 before the handler runs. It only "always succeeds" in the narrower sense that a syntactically valid, unexpired refresh token which has already been revoked (e.g. a second logout call, or one already consumed by /auth/refresh-token) is treated as a no-op success rather than an error.',
  })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({
    description: 'Logged out successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token missing, malformed, or expired — rejected by the RefreshTokenGuard before this endpoint\'s "always succeeds" logic ever runs.',
    ...errorExample(401, 'Invalid or expired refresh token'),
  })
  @Post('logout')
  async logout(
    @Req() req: RefreshAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(req.user.rawRefreshToken);
    this.tokenService.clearRefreshCookie(req, res);
    return result;
  }

  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } }) // Logout All Devices: Max 5 requests every 1 hour
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke every session for the current user (all devices)',
    description:
      "Immediately invalidates every access and refresh token the current user holds, everywhere — bumps the account's tokenVersion so already-issued access tokens fail their next validation, and deletes every stored refresh token. Requires a currently-valid access token (unlike /auth/logout, which only needs a refresh token).",
  })
  @ApiOkResponse({
    description: 'All sessions revoked.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Logged out from all devices successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description:
      "This endpoint is not @Public(), so it also runs behind the global AuthorizationGuard — the caller's role must have a matching (path, method) row in the authorization table, or the request is rejected before reaching the handler.",
    ...errorExample(
      403,
      "Access denied. Role 'USER' cannot POST /auth/logout-all-devices",
    ),
  })
  @ApiNotFoundResponse({
    description: 'User no longer exists.',
    ...errorExample(404, 'User not found'),
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded (max 5 requests per hour per client).',
    ...errorExample(429, 'ThrottlerException: Too Many Requests'),
  })
  @Post('logout-all-devices')
  async logoutAllDevices(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAllDevices(userId);
  }
}
