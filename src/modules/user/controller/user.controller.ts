import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

import { UserService } from '../service/user.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserListResponseDto } from '../dto/user-list-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { errorExample } from 'src/common/dto/error-response.dto';

@ApiTags('User')
@ApiBearerAuth('access-token')
@ApiExtraModels(UserResponseDto)
@ApiUnauthorizedResponse({
  description: 'Missing, expired, or otherwise invalid access token.',
  ...errorExample(401, 'Unauthorized'),
})
@ApiForbiddenResponse({
  description:
    "The caller's role is not authorized to call this endpoint (see the authorization table for their role).",
  ...errorExample(403, "Access denied. Role 'USER' cannot GET /users"),
})
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get the current authenticated user',
    description:
      'Returns the profile of whichever user the access token belongs to. Use this to render "my account" screens, or to check the caller\'s role/permissions client-side. Always available to any authenticated user, regardless of role.',
  })
  @ApiOkResponse({
    description: 'Current user retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        user: { $ref: getSchemaPath(UserResponseDto) },
      },
    },
  })
  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return {
      user: await this.userService.getById(userId),
    };
  }

  @ApiOperation({
    summary: 'Update the current authenticated user profile',
    description:
      'Partially updates the profile of whichever user the access token belongs to. Every field is optional — send only the fields you want changed; omitted fields are left untouched. Does not allow changing email, password, or role — use POST /auth/change-password for passwords.',
  })
  @ApiOkResponse({
    description: 'Profile updated successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile updated successfully' },
        user: { $ref: getSchemaPath(UserResponseDto) },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'One or more fields failed validation (e.g. contactNumber not exactly 10 digits, or an invalid gender value). The global ValidationPipe has no custom errorHttpStatusCode, so this is 400, not 422.',
    ...errorExample(400, [
      'Contact number must be exactly 10 digits',
      'gender must be a valid enum value',
    ]),
  })
  @Patch('me')
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return {
      message: 'Profile updated successfully',
      user: await this.userService.updateProfile(userId, dto),
    };
  }

  @ApiOperation({
    summary: 'Get a user by id',
    description:
      'Fetches a single user by their id. Returns the same safe, public-facing fields as GET /users/me — never password, OTP, or other internal fields, regardless of who the caller is.',
  })
  @ApiParam({
    name: 'id',
    description: "The target user's id",
    example: 'aB3dE9fG',
  })
  @ApiOkResponse({
    description: 'User found.',
    schema: {
      type: 'object',
      properties: {
        user: { $ref: getSchemaPath(UserResponseDto) },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No user exists with the given id.',
    ...errorExample(404, 'User not found'),
  })
  @Get(':id')
  async getById(@Param('id') id: string) {
    return { user: await this.userService.getById(id) };
  }

  @ApiOperation({
    summary: 'List/search users',
    description:
      'Cursor-paginated list of users, optionally filtered by role and/or a case-insensitive partial match against first or last name. Results are ordered oldest-first (by createdAt, then id) for stable pagination. To fetch the next page, pass the `nextCursorId` from the previous response as `cursorId`.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Case-insensitive partial match against first or last name',
    example: 'jane',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'USER'],
    description: 'Filter to only users with this role',
  })
  @ApiQuery({
    name: 'cursorId',
    required: false,
    description:
      'The `nextCursorId` value from a previous response. Omit to fetch the first page.',
    example: 'aB3dE9fG',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size. Defaults to 10, capped at 100.',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Paginated list of users.',
    type: UserListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'role is not one of the valid Role enum values.',
    ...errorExample(400, ['role must be a valid enum value']),
  })
  @ApiNotFoundResponse({
    description: 'The provided cursorId does not match any user.',
    ...errorExample(404, 'Invalid cursorId provided'),
  })
  @Get()
  async list(@Query() query: QueryUserDto) {
    return this.userService.list(query);
  }
}
