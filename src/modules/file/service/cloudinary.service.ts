import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import type { Multer } from 'multer';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // Read via ConfigService (validated at boot) instead of raw process.env,
    // so a missing Cloudinary credential fails fast like everything else.
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
    });
  }

  async uploadFile(
    file: Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || undefined;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error)
            return reject(
              new Error(`Cloudinary upload failed: ${error.message}`),
            );
          if (!result)
            return reject(new Error('No result returned from Cloudinary'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error: UploadApiErrorResponse) => {
        if (error)
          return reject(
            new Error(
              `Failed to delete file from Cloudinary: ${error.message}`,
            ),
          );
        resolve();
      });
    });
  }
}
