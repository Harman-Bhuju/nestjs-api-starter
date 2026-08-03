import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'The email the OTP was sent to',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '123456',
    description:
      '6-digit code from the email. Valid for 10 minutes from when it was sent; locks the account for 15 minutes after 3 wrong attempts.',
  })
  @IsString()
  @Length(6, 6)
  otp!: string;
}
