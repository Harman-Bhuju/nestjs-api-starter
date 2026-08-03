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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Multer } from 'multer';

import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { errorExample } from 'src/common/dto/error-response.dto';

import { FileService } from '../service/file.service';
import { FileResponseDto } from '../dto/file-response.dto';
import { multerOptions } from 'src/config/configuration/multer.config';

@ApiTags('Files')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Missing or invalid access token.',
  ...errorExample(401, 'Unauthorized'),
})
@ApiForbiddenResponse({
  description:
    "Neither route here is @Public(), so both also run behind the global AuthorizationGuard — the caller's role must have a matching (path, method) row in the authorization table.",
  ...errorExample(403, "Access denied. Role 'USER' cannot POST /files/profile"),
})
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({
    summary: "Upload or replace the current user's profile picture",
    description:
      "Uploads a single image or PDF and sets it as the current user's profile picture. If the user already has one, the previous file is replaced: the old Cloudinary asset is deleted (best-effort — a failed delete does not block the upload) and the same File row is updated in place, so its id does not change on replacement. Accepts JPEG, PNG, WEBP, and PDF; anything else is rejected before upload.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `Multipart form with a single "file" field. Max size is configured via FILE_SIZE_LIMIT_MB (10MB by default).`,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JPEG, PNG, WEBP, or PDF file',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Profile picture uploaded/replaced successfully.',
    type: FileResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'No file was provided (rejected by the Multer fileFilter before the request body is even parsed further), or the uploaded file\'s MIME type is not one of the allowed types (JPEG, PNG, WEBP, PDF) — that check happens in FileService, which throws BadRequestException, not a 415.',
    ...errorExample(
      400,
      'Unsupported file type "image/gif". Allowed: JPEG, PNG, WEBP, PDF.',
    ),
  })
  @ApiPayloadTooLargeResponse({
    description: 'The uploaded file exceeds FILE_SIZE_LIMIT_MB.',
    ...errorExample(413, 'File too large. Maximum size is 10MB.'),
  })
  @ApiNotFoundResponse({
    description: 'The authenticated user no longer exists.',
    ...errorExample(404, 'User not found'),
  })
  @ApiInternalServerErrorResponse({
    description:
      'Cloudinary accepted the upload but returned no usable url/publicId.',
    ...errorExample(500, 'Failed to upload file'),
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Post('profile')
  async uploadProfilePicture(
    @UploadedFile() file: Multer.File,
    @Req() req: AuthRequest,
  ) {
    return this.fileService.uploadProfilePicture(req.user.sub, file);
  }

  @ApiOperation({
    summary: "Remove the current user's profile picture",
    description:
      "Deletes the current user's profile picture, both the Cloudinary asset (best-effort) and the File row. A no-op error (404) if the user has no profile picture set.",
  })
  @ApiOkResponse({
    description: 'Profile picture removed.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile picture removed' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The user has no profile picture to remove.',
    ...errorExample(404, 'No profile picture found'),
  })
  @Delete('profile')
  async deleteProfilePicture(@Req() req: AuthRequest) {
    return this.fileService.deleteProfilePicture(req.user.sub);
  }
}
