import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/modules/user/dto/user-response.dto';

/** Returned by POST /auth/login. */
export class AuthResponseDto {
  @ApiProperty({
    description:
      'Short-lived JWT. Send as `Authorization: Bearer <accessToken>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description:
      'Long-lived JWT used to obtain a new access+refresh pair via POST /auth/refresh-token. Web clients also receive this in an httpOnly cookie; this field exists mainly for mobile/native clients.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;
}
