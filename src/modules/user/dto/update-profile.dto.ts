import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { normalizeText } from 'src/common/transformers/normalize-text.transformer';
import { Gender } from 'src/common/enums/gender.enum';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Jane' })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, nullable: true, example: 'Marie' })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiProperty({ required: false, example: 'Doe' })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, example: '9800000000' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Contact number must be exactly 10 digits',
  })
  contactNumber?: string;

  @ApiProperty({ required: false, example: 'Thamel' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Bagmati' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false, example: 'Kathmandu' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Self-reported gender',
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
