import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeText } from 'src/common/transformers/normalize-text.transformer';
import { Gender } from 'src/common/enums/gender.enum';

export class RegisterUserDto {
  @ApiProperty({ example: 'Jane' })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Marie', required: false, nullable: true })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiProperty({ example: 'Doe' })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
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

  // ════════════════════════════════════════════
  // Optional address fields — collected at registration but never
  // required, since plenty of valid signups won't have them yet.
  // ════════════════════════════════════════════

  @ApiProperty({
    enum: Gender,
    required: false,
    description: 'Self-reported gender',
    example: Gender.FEMALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: '9800000000', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Contact number must be exactly 10 digits',
  })
  contactNumber?: string;

  @ApiProperty({ example: 'Thamel', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Bagmati', required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ example: 'Kathmandu', required: false })
  @IsOptional()
  @IsString()
  district?: string;
}
