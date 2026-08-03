import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'Must belong to an already-verified account',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    description:
      'Push notification token for this device. Optional — omit if the client does not support push notifications.',
    example: 'fcm-token-example-abc123',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string | null;
}
