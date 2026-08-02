import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from 'src/common/decorators/public.decorator';
import type { RefreshAuthRequest } from 'src/common/interfaces/refresh-auth-request.interface';

import { AuthService } from '../service/auth.service';
import { TokenService } from '../service/token.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { LoginDto } from '../dto/login.dto';
import { OtpVerifyDto } from '../dto/otp-verify.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user. OTP sent to email.' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful. OTP sent to email.',
  })
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Public()
  @ApiOperation({
    summary:
      'Verify OTP and email. Returns JWT tokens on success for registration flow.',
  })
  @ApiBody({ type: OtpVerifyDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary:
      'Send/resend OTP. Used for both email verification and forgot-password.',
  })
  @ApiBody({ type: ResendOtpDto })
  @Post('send-otp')
  async sendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @ApiOperation({
    summary:
      'Change password. Requires prior OTP verification via /verify-otp.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email + password. Returns JWT tokens.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
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
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary:
      'Exchange a valid refresh token for a new access+refresh pair (rotated).',
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
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Logout the current device/session.' })
  @Post('logout')
  async logout(
    @Req() req: RefreshAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(req.user.rawRefreshToken);
    this.tokenService.clearRefreshCookie(req, res);
    return result;
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke every session for the current user (all devices).',
  })
  @Post('logout-all-devices')
  async logoutAllDevices(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAllDevices(userId);
  }
}
