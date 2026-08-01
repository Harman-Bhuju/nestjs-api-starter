import { Module } from '@nestjs/common';
import { FileuploadService } from './service/fileupload.service';
import { FileuploadController } from './controller/fileupload.controller';

@Module({
  providers: [FileuploadService],
  controllers: [FileuploadController],
})
export class FileuploadModule {}
