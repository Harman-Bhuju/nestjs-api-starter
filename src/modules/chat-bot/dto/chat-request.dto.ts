import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const MESSAGE_MIN_LENGTH = 1;
const MESSAGE_MAX_LENGTH = 2000;

export class ChatRequestDto {
  @ApiProperty({
    description:
      'The question or message the visitor wants to ask the website assistant.',
    example: 'What plans do you offer and what is included in each one?',
    minLength: MESSAGE_MIN_LENGTH,
    maxLength: MESSAGE_MAX_LENGTH,
  })
  @IsString({ message: 'message must be a string.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'message must not be empty.' })
  @MinLength(MESSAGE_MIN_LENGTH, {
    message: `message must be at least ${MESSAGE_MIN_LENGTH} character long.`,
  })
  @MaxLength(MESSAGE_MAX_LENGTH, {
    message: `message must not exceed ${MESSAGE_MAX_LENGTH} characters.`,
  })
  message!: string;
}
