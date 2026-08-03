import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';
import { Gender } from 'src/common/enums/gender.enum';
import { User } from '../entities/user.entity';

/**
 * Safe, public-facing shape of a User. NEVER add password, otpCode,
 * otpExpiryTime, otpAttempts, otpLockedUntil, or any other internal/select:false
 * column to this class — use {@link UserResponseDto.fromEntity} everywhere a
 * User needs to leave the process so that rule can't be forgotten ad hoc.
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'Unique user id',
    example: 'aB3dE9fG',
  })
  id!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiPropertyOptional({
    example: 'Marie',
    nullable: true,
    description: 'Omitted or null if the user has no middle name',
  })
  middleName!: string | null;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({
    description: 'Computed as `firstName [middleName] lastName`',
    example: 'Jane Marie Doe',
  })
  fullName!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({
    enum: Role,
    description: 'Human-readable role name',
    example: Role.USER,
  })
  role!: Role;

  @ApiProperty({
    description:
      "FK into the role table. Matches the roleId claim on this user's access token.",
    example: 'ab12cd34',
  })
  roleId!: string;

  @ApiPropertyOptional({
    enum: Gender,
    nullable: true,
    description: 'Self-reported gender. Optional — may be null if never provided.',
    example: Gender.FEMALE,
  })
  gender!: Gender | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '9800000000',
    description: '10-digit contact number, if provided',
  })
  contactNumber!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Thamel' })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Bagmati' })
  province!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Kathmandu' })
  district!: string | null;

  @ApiProperty({
    description: 'Whether this user has completed email/OTP verification',
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: "URL of the user's profile picture, if one has been uploaded",
    example: 'https://res.cloudinary.com/demo/image/upload/v1/profile.jpg',
  })
  profileImageUrl!: string | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-20T14:12:00.000Z' })
  updatedAt!: Date;

  /**
   * Maps a User entity to its safe public representation.
   *
   * Requires `user.role` (the relation, not just roleId) to be loaded —
   * pass `relations: { role: true }` (and `select: { role: { id: true, role: true } }`
   * if you want to limit the join) wherever you fetch the User that will be
   * passed in here. `profileImage` is optional; omit it from `relations` and
   * this will simply report `profileImageUrl: null`.
   */
  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.firstName = user.firstName;
    dto.middleName = user.middleName;
    dto.lastName = user.lastName;
    dto.fullName = user.fullName;
    dto.email = user.email;
    dto.role = user.role.role;
    dto.roleId = user.roleId;
    dto.gender = user.gender ?? null;
    dto.contactNumber = user.contactNumber;
    dto.address = user.address;
    dto.province = user.province;
    dto.district = user.district;
    dto.isEmailVerified = user.isEmailVerified;
    dto.profileImageUrl = user.profileImage?.fileUrl ?? null;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
