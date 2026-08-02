import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileuploadService } from './service/fileupload.service';
import { CloudinaryService } from './service/cloudinary.service';
import { FileuploadController } from './controller/fileupload.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), UserModule],
  controllers: [FileuploadController],
  providers: [FileuploadService, CloudinaryService],
  exports: [FileuploadService],
})
export class FileuploadModule {}
