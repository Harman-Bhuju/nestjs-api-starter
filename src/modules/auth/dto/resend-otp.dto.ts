import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'jane@example.com',
    description:
      'Account email. A generic success message is always returned, whether or not this address is registered.',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
