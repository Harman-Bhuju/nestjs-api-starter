import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'jane@example.com',
    description:
      'Must be an account that has already completed POST /auth/verify-otp for the forgot-password flow',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'NewSecurePassword456!',
    description:
      'At least 8 characters, at most 30, with at least one uppercase letter, one lowercase letter, and one number.',
  })
  @IsString()
  @Length(8, 30)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({
    example: 'NewSecurePassword456!',
    description: 'Must exactly match `password`',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}
