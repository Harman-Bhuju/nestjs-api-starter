import { Module } from '@nestjs/common';
import { MessagingGateway } from './gateways/messaging.gateway';

@Module({
  providers: [MessagingGateway]
})
export class MessagingModule { }
