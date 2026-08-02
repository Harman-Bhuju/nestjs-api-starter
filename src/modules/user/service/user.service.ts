import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { QueryUserDto } from '../dto/query-user.dto';

const SAFE_USER_SELECT: FindOptionsSelect<User> = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  role: true,
  contactNumber: true,
  address: true,
  province: true,
  district: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

const SAFE_USER_COLUMNS = [
  'id',
  'firstName',
  'middleName',
  'lastName',
  'email',
  'role',
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

  async getById(id: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: SAFE_USER_SELECT,
      relations: {
        profileImage: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.province !== undefined) user.province = dto.province;
    if (dto.district !== undefined) user.district = dto.district;
    if (dto.contactNumber !== undefined) user.contactNumber = dto.contactNumber;

    const saved = await this.userRepository.save(user);
    const { password: _password, otpCode: _otp, ...safeUser } = saved;
    return safeUser;
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
  async list(query: QueryUserDto) {
    // Validate and cap the requested page size (default: 10, max: 100)
    const limit = query.limit
      ? Math.min(parseInt(query.limit, 10) || 10, 100)
      : 10;

    // Build the base query and select only safe user fields.
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select(SAFE_USER_COLUMNS.map((f) => `user.${f}`));

    // Filter users by role if provided.
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
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
      data: users,
      pagination: {
        limit,
        // Cursor for the next request.
        nextCursorId: hasNextPage ? users[users.length - 1].id : null,
        hasNextPage,
      },
    };
  }
}
