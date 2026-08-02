import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';

/**
 * Shared Multer config so every upload endpoint enforces the same size
 * limit and basic presence check, instead of redefining this object
 * per-controller (as the original code did).
 *
 * File-size limit is read from FILE_SIZE_LIMIT_MB at import time — this
 * runs after ConfigModule has already validated/loaded the env, since
 * Nest evaluates decorators (which reference this) at module-init time.
 */
const fileSizeLimitMb = Number(process.env.FILE_SIZE_LIMIT_MB ?? 10);

export const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: fileSizeLimitMb * 1024 * 1024,
  },
  fileFilter: (
    _req: unknown,
    file: Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!file) {
      cb(new BadRequestException('No file provided'), false);
      return;
    }
    cb(null, true);
  },
};
