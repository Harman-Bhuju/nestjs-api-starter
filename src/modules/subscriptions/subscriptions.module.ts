import { Module } from '@nestjs/common';
import { SubscriptionsService } from './service/subscriptions.service';
import { SubscriptionsController } from './controller/subscriptions.controller';

@Module({
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController]
})
export class SubscriptionsModule { }
