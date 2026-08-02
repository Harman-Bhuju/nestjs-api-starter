import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from '../service/user.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get the current authenticated user.' })
  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return {
      user: await this.userService.getById(userId),
    };
  }

  @ApiOperation({ summary: 'Update the current authenticated user profile.' })
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

  @ApiOperation({ summary: 'Get a user by id.' })
  @ApiResponse({ status: 200 })
  @Get(':id')
  async getById(@Param('id') id: string) {
    return { user: await this.userService.getById(id) };
  }

  @ApiOperation({
    summary:
      'List/search users. Filterable by role and name, cursor-paginated.',
  })
  @Get()
  async list(@Query() query: QueryUserDto) {
    return this.userService.list(query);
  }
}
