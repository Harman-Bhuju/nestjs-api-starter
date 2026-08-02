import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  controllers: [UserController],
  // Exported so AuthModule can reuse the same User repository instead of
  // re-registering the entity (which TypeORM would otherwise let you do,
  // but then you'd have two sources of truth for the same table).
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
