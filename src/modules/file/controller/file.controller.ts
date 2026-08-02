import {
  Controller,
  Delete,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Multer } from 'multer';

import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

import { FileService } from '../service/file.service';
import { multerOptions } from 'src/config/configuration/multer.config';

@ApiTags('Files')
@ApiBearerAuth('access-token')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({
    summary: "Upload or replace the current user's profile picture.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Post('profile')
  async uploadProfilePicture(
    @UploadedFile() file: Multer.File,
    @Req() req: AuthRequest,
  ) {
    return this.fileService.uploadProfilePicture(req.user.sub, file);
  }

  @ApiOperation({ summary: "Remove the current user's profile picture." })
  @Delete('profile')
  async deleteProfilePicture(@Req() req: AuthRequest) {
    return this.fileService.deleteProfilePicture(req.user.sub);
  }
}
