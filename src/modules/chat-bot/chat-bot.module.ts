import { Module } from '@nestjs/common';
import { ChatBotController } from './controller/chat-bot.controller';
import { ChatBotService } from './service/chat-bot.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ChatBotController],
  providers: [ChatBotService],
})
export class ChatBotModule {}