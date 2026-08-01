import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Web clients send the refresh token via httpOnly cookie (nothing to validate
// here beyond the cookie itself). Mobile/native clients send it in the body.
export class RefreshTokenDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto extends RefreshTokenDto {}
