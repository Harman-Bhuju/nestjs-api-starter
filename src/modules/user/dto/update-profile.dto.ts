import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { normalizeText } from 'src/common/transformers/normalize-text.transformer';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  middleName?: string | null;

  @ApiProperty({ required: false })
  @Transform(normalizeText)
  @Length(1, 50)
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Contact number must be exactly 10 digits',
  })
  contactNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;
}
