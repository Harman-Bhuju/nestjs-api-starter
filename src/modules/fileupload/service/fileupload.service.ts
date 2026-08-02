import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Multer } from 'multer';

import { File } from '../entities/file.entity';
import { FileType } from 'src/common/enums/file-type.enum';
import { FileMetaType } from 'src/common/enums/file-metatype.enum';

import { CloudinaryService } from './cloudinary.service';
import { User } from 'src/modules/user/entities/user.entity';

/**
 * Only handles profile pictures right now — by design, a user must already
 * exist (see AuthService.register) before a profile picture can be attached to them.
 * Adding a new FileType later? Follow the same shape: validate → upload to Cloudinary → create/replace the File row → return it.
 * Don't grow this class with per-type branches — split into its own service once you have a second real type with different rules.
 */
@Injectable()
export class FileuploadService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private static readonly ALLOWED_MIME_TYPES: Record<string, FileMetaType> = {
    'image/jpeg': FileMetaType.IMAGE,
    'image/png': FileMetaType.IMAGE,
    'image/jpg': FileMetaType.IMAGE,
    'image/webp': FileMetaType.IMAGE,
    'application/pdf': FileMetaType.PDF,
  };

  private resolveMetaType(file: Multer.File): FileMetaType {
    const metaType = FileuploadService.ALLOWED_MIME_TYPES[file.mimetype];

    if (!metaType) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: JPEG, PNG, WEBP, PDF.`,
      );
    }

    return metaType;
  }

  async uploadProfilePicture(userId: string, file: Multer.File): Promise<File> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const metaType = this.resolveMetaType(file);
    const existing = await this.fileRepository.findOne({
      where: { profileUser: { id: userId } },
    });

    const { url, publicId } = await this.cloudinaryService.uploadFile(file);
    if (!url || !publicId) {
      throw new InternalServerErrorException('Failed to upload file');
    }

    if (existing) {
      // Best-effort cleanup of the old asset — a failed delete shouldn't block
      // the user from getting their new picture saved.
      try {
        await this.cloudinaryService.deleteFile(existing.publicId);
      } catch {
        // swallow — orphaned Cloudinary asset is an acceptable trade-off here
      }
      existing.fileUrl = url;
      existing.publicId = publicId;
      existing.metaType = metaType;
      return this.fileRepository.save(existing);
    }

    const created = this.fileRepository.create({
      id: File.generateId(),
      fileUrl: url,
      publicId,
      type: FileType.PROFILE,
      metaType,
      profileUser: user,
    });
    return this.fileRepository.save(created);
  }

  async deleteProfilePicture(userId: string): Promise<{ message: string }> {
    const existing = await this.fileRepository.findOne({
      where: { profileUser: { id: userId } },
    });
    if (!existing) throw new NotFoundException('No profile picture found');

    try {
      await this.cloudinaryService.deleteFile(existing.publicId);
    } catch {
      // swallow — still remove our record even if Cloudinary cleanup fails
    }
    await this.fileRepository.remove(existing);
    return { message: 'Profile picture removed' };
  }
}
