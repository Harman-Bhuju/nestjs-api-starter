import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Web clients send the refresh token via httpOnly cookie (nothing to validate
// here beyond the cookie itself). Mobile/native clients send it in the body.
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Required for mobile/native clients only. Web clients omit this — the refresh token is read from the httpOnly cookie set at login instead.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto extends RefreshTokenDto {}
