import { ApiProperty } from '@nestjs/swagger';
import { FileMetaType } from 'src/common/enums/file-metatype.enum';
import { FileType } from 'src/common/enums/file-type.enum';
import { File } from '../entities/file.entity';

/**
 * Safe, public-facing shape of a File. Deliberately omits `publicId` — the
 * Cloudinary asset id is an internal implementation detail (it's what lets
 * our backend delete/replace the asset) and has no reason to leave the
 * process.
 */
export class FileResponseDto {
  @ApiProperty({ example: 'xY7zA1bC' })
  id!: string;

  @ApiProperty({
    description: 'Public URL of the uploaded file',
    example:
      'https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/profile.jpg',
  })
  fileUrl!: string;

  @ApiProperty({
    enum: FileType,
    description: 'What this file is used for',
    example: FileType.PROFILE,
  })
  type!: FileType;

  @ApiProperty({
    enum: FileMetaType,
    description: 'The underlying content type of the stored file',
    example: FileMetaType.IMAGE,
  })
  metaType!: FileMetaType;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-20T14:12:00.000Z' })
  updatedAt!: Date;

  static fromEntity(file: File): FileResponseDto {
    const dto = new FileResponseDto();
    dto.id = file.id;
    dto.fileUrl = file.fileUrl;
    dto.type = file.type;
    dto.metaType = file.metaType;
    dto.createdAt = file.createdAt;
    dto.updatedAt = file.updatedAt;
    return dto;
  }
}
