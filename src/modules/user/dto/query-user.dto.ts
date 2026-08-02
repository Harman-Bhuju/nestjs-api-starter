import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

export class QueryUserDto {
  @ApiProperty({
    required: false,
    description: 'Matches against first or last name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursorId?: string;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsString()
  limit?: string;
}
