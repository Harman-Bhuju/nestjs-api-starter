import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserListResponseDto } from '../dto/user-list-response.dto';

// `role` is nested here (rather than `role: true`) because it's now a
// relation (see User.role) — this selects only role.id/role.role off the
// joined row instead of pulling the whole Role entity.
const SAFE_USER_SELECT: FindOptionsSelect<User> = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  roleId: true,
  role: { id: true, role: true },
  gender: true,
  contactNumber: true,
  address: true,
  province: true,
  district: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

// Plain-column projection for the QueryBuilder-based list() below. `role` is
// deliberately absent — it's joined and selected separately since it's a
// relation, not a column on `user`.
const SAFE_USER_COLUMNS = [
  'id',
  'firstName',
  'middleName',
  'lastName',
  'email',
  'roleId',
  'gender',
  'contactNumber',
  'address',
  'province',
  'district',
  'isEmailVerified',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: SAFE_USER_SELECT,
      relations: {
        role: true,
        profileImage: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return UserResponseDto.fromEntity(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, profileImage: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.province !== undefined) user.province = dto.province;
    if (dto.district !== undefined) user.district = dto.district;
    if (dto.contactNumber !== undefined) user.contactNumber = dto.contactNumber;
    if (dto.gender !== undefined) user.gender = dto.gender;

    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  /**
   * Returns a cursor-paginated list of users.
   *
   * Features:
   * - Filters by role and partial first/last name.
   * - Uses cursor-based pagination for efficient large datasets.
   * - Selects only safe, non-sensitive user fields.
   * - Orders by createdAt and id to ensure stable pagination.
   */
  async list(query: QueryUserDto): Promise<UserListResponseDto> {
    // Validate and cap the requested page size (default: 10, max: 100)
    const limit = query.limit
      ? Math.min(parseInt(query.limit, 10) || 10, 100)
      : 10;

    // Build the base query and select only safe user fields, joining `role`
    // (needed both to filter by role name and to render it in the response)
    // and `profileImage` (so profileImageUrl is populated consistently with
    // getById()).
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.profileImage', 'profileImage')
      .select([
        ...SAFE_USER_COLUMNS.map((f) => `user.${f}`),
        'role.id',
        'role.role',
        'profileImage.fileUrl',
      ]);

    // Filter users by role name if provided (joins through to the role table
    // since `role` now lives there instead of being a plain enum column).
    if (query.role) {
      qb.andWhere('role.role = :role', { role: query.role });
    }

    // Search by first or last name (case-insensitive).
    if (query.name) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:name) OR LOWER(user.lastName) LIKE LOWER(:name))',
        { name: `%${query.name}%` },
      );
    }

    // Continue listing after the provided cursor.
    if (query.cursorId) {
      // Retrieve the cursor user's ordering values.
      const cursorUser = await this.userRepository.findOne({
        where: { id: query.cursorId },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (!cursorUser) {
        throw new NotFoundException('Invalid cursorId provided');
      }

      // Return only records after the cursor.
      qb.andWhere(
        '(user.createdAt > :cursorDate OR (user.createdAt = :cursorDate AND user.id > :cursorId))',
        {
          cursorDate: cursorUser.createdAt,
          cursorId: query.cursorId,
        },
      );
    }

    // Keep results in a stable order for cursor pagination.
    qb.orderBy('user.createdAt', 'ASC')
      .addOrderBy('user.id', 'ASC')
      // Fetch one extra record to detect whether another page exists.
      .take(limit + 1);

    const users = await qb.getMany();

    // If an extra record exists, another page is available.
    const hasNextPage = users.length > limit;

    // Remove the extra record before returning the response.
    if (hasNextPage) {
      users.pop();
    }

    return {
      data: users.map((user) => UserResponseDto.fromEntity(user)),
      pagination: {
        limit,
        // Cursor for the next request.
        nextCursorId: hasNextPage ? users[users.length - 1].id : null,
        hasNextPage,
      },
    };
  }
}
