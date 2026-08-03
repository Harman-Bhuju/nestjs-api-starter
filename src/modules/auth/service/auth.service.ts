import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/modules/user/entities/user.entity';
import { StringUtils } from 'src/common/utils/string.utils';
import { OtpUtils } from 'src/common/utils/otp.utils';
import { Role as RoleEnum } from 'src/common/enums/role.enum';
import { EmailService } from 'src/modules/email/service/email.service';
import { UserResponseDto } from 'src/modules/user/dto/user-response.dto';

import { RegisterUserDto } from '../dto/register-user.dto';
import { LoginDto } from '../dto/login.dto';
import { OtpVerifyDto } from '../dto/otp-verify.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { TokenService } from './token.service';
import { TokenPair } from '../interfaces/token-pair.interface';
import { Role } from '../entities/role.entity';

const OTP_EXPIRED_MESSAGE = 'OTP has expired. Please request a new one.';
const MAX_ATTEMPTS_MESSAGE = `Maximum OTP attempts exceeded. Account locked for ${OtpUtils.LOCK_DURATION_MINUTES} minutes.`;

/**
 * Owns account lifecycle: register, verify email, login, forgot/change
 * password, logout. Anything about an *existing* logged-in user's profile
 * (get/update/list) lives in UserService instead — see that module.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  private get saltRounds(): number {
    return Number(this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
  }

  async register(
    dto: RegisterUserDto,
  ): Promise<{ message: string; userId: string; email: string }> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    // Every self-registered user gets the baseline USER role. This row must
    // already exist — it's created by the role/authorization seed script
    // (src/scripts/create-routes.ts), which should run once per environment
    // before the API accepts traffic.
    const defaultRole = await this.roleRepository.findOne({
      where: { role: RoleEnum.USER },
    });
    if (!defaultRole) {
      throw new InternalServerErrorException(
        `Default role '${RoleEnum.USER}' is not seeded. Run the role seed script first.`,
      );
    }

    const otp = OtpUtils.generateOtp();

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Transaction so "create user" and "send OTP email" succeed or fail
    // together. Without this, a failed email would still leave a committed,
    // unverified User row behind — the person couldn't tell if registration
    // "worked", and retrying would just hit ConflictException above.
    return this.userRepository.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);

      const user = userRepo.create({
        id: StringUtils.generateRandomAlphaNumeric(8),
        firstName: dto.firstName,
        middleName: dto.middleName ?? null,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        role: defaultRole,
        gender: dto.gender ?? null,
        contactNumber: dto.contactNumber ?? null,
        address: dto.address ?? null,
        province: dto.province ?? null,
        district: dto.district ?? null,
        otpCode: otp,
        otpExpiryTime: OtpUtils.getOtpExpiryTime(),
        otpAttempts: 0,
        otpLockedUntil: null,
        isEmailVerified: false,
      });

      const saved = await userRepo.save(user);

      // Throws (generic message, real cause logged inside EmailService) if
      // delivery fails — that exception propagates out of this callback,
      // which makes TypeORM roll back the insert above automatically.
      try {
        await this.emailService.sendVerificationOtp(
          saved.email,
          saved.firstName,
          otp,
        );
      } catch {
        throw new InternalServerErrorException(
          "Registration could not be completed because we couldn't send the verification email. Please try again.",
        );
      }

      return {
        message: `Registration successful! OTP sent to ${dto.email}. Valid for ${OtpUtils.OTP_VALIDITY_MINUTES} minutes.`,
        userId: saved.id,
        email: saved.email,
      };
    });
  }

  async sendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const genericMessage = `If an account exists for ${dto.email}, an OTP has been sent. Valid for ${OtpUtils.OTP_VALIDITY_MINUTES} minutes.`;

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
      },
    });

    // Deliberately NOT throwing NotFoundException here. This endpoint feeds
    // the forgot-password flow — telling a caller "no account exists for
    // that email" is exactly the kind of account-enumeration leak you don't
    // want on a password-reset entry point. register()'s ConflictException
    // still reveals "email taken" at signup, which is a normal, accepted
    // tradeoff there — this endpoint is the more sensitive one to guard.
    if (!user) {
      return { message: genericMessage };
    }

    // isEmailVerified = false → still registering, resend the verification OTP.
    // isEmailVerified = true  → forgot-password flow, send a reset OTP instead.
    const isRegistrationFlow = !user.isEmailVerified;
    const otp = OtpUtils.generateOtp();

    // Same reasoning as register(): if the email fails to send, roll back
    // the OTP fields too, so the user's previous (still-valid) OTP isn't
    // silently invalidated by an update that never actually reached them.
    return this.userRepository.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);

      await userRepo.update(user.id, {
        otpCode: otp,
        otpExpiryTime: OtpUtils.getOtpExpiryTime(),
        otpAttempts: 0,
        otpLockedUntil: null,
        ...(isRegistrationFlow ? {} : { isPasswordResetVerified: false }),
      });

      try {
        if (isRegistrationFlow) {
          await this.emailService.sendVerificationOtp(
            user.email,
            user.firstName,
            otp,
          );
        } else {
          await this.emailService.sendPasswordResetOtp(
            user.email,
            user.firstName,
            otp,
          );
        }
      } catch {
        throw new InternalServerErrorException(
          'We could not send the OTP at this time. Please try again.',
        );
      }
      return { message: genericMessage };
    });
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: { role: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: { id: true, role: true },
        isEmailVerified: true,
        isPasswordResetVerified: true,
        otpCode: true,
        otpExpiryTime: true,
        otpAttempts: true,
        otpLockedUntil: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isRegistrationFlow = !user.isEmailVerified;
    const alreadyVerified = isRegistrationFlow
      ? user.isEmailVerified
      : user.isPasswordResetVerified;

    if (alreadyVerified) {
      throw new BadRequestException('Email is already verified');
    }
    if (OtpUtils.isAccountLocked(user.otpLockedUntil)) {
      throw new BadRequestException(
        `Account locked. Try again in ${OtpUtils.getRemainingLockTime(user.otpLockedUntil)} seconds.`,
      );
    }
    if (!user.otpCode || OtpUtils.isOtpExpired(user.otpExpiryTime)) {
      throw new BadRequestException(OTP_EXPIRED_MESSAGE);
    }

    if (user.otpCode !== dto.otp) {
      const otpAttempts = user.otpAttempts + 1;
      const locked = OtpUtils.isMaxAttemptsExceeded(otpAttempts);
      await this.userRepository.update(user.id, {
        otpAttempts,
        otpLockedUntil: locked ? OtpUtils.getLockUntilTime() : null,
      });
      if (locked) throw new BadRequestException(MAX_ATTEMPTS_MESSAGE);
      throw new BadRequestException(
        `Invalid OTP. ${OtpUtils.MAX_ATTEMPTS - otpAttempts} attempts remaining.`,
      );
    }

    await this.userRepository.update(user.id, {
      ...(isRegistrationFlow
        ? { isEmailVerified: true }
        : { isPasswordResetVerified: true }),
      otpCode: null,
      otpExpiryTime: null,
      otpAttempts: 0,
      otpLockedUntil: null,
    });

    if (isRegistrationFlow) {
      return {
        message: 'Email verified successfully',
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role.role,
        userId: user.id,
      };
    }
    return {
      message: 'OTP verified successfully. You can now change your password.',
    };
  }

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        isPasswordResetVerified: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isPasswordResetVerified) {
      throw new BadRequestException(
        'OTP not verified. Please verify OTP before changing password',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);
    // Bump tokenVersion too — a password change should kill every existing session.
    await this.userRepository.increment({ id: user.id }, 'tokenVersion', 1);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      isPasswordResetVerified: false,
    });
    await this.tokenService.revokeAllTokensForUser(user.id);

    return { message: 'Password changed successfully' };
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: { role: true, profileImage: true },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        password: true,
        roleId: true,
        role: { id: true, role: true },
        gender: true,
        contactNumber: true,
        address: true,
        province: true,
        district: true,
        tokenVersion: true,
        isEmailVerified: true,
        otpLockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email with OTP before logging in',
      );
    }
    if (OtpUtils.isAccountLocked(user.otpLockedUntil)) {
      throw new UnauthorizedException(
        `Account locked. Try again in ${OtpUtils.getRemainingLockTime(user.otpLockedUntil)} seconds.`,
      );
    }

    const { accessToken, refreshToken } =
      await this.tokenService.issueTokens(user);

    return {
      accessToken,
      refreshToken,
      user: UserResponseDto.fromEntity(user),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.rotateRefreshToken(refreshToken);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    await this.tokenService.revokeAllTokensForUser(userId);

    return { message: 'Logged out from all devices successfully' };
  }
}
