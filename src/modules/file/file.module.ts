import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from 'src/modules/file/entities/file.entity';
import { FileService } from './service/file.service';
import { CloudinaryService } from './service/cloudinary.service';
import { FileController } from './controller/file.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), UserModule],
  controllers: [FileController],
  providers: [FileService, CloudinaryService],
  exports: [FileService],
})
export class FileModule {}
