import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { SubscriptionsService } from './service/subscriptions.service';
import { SubscriptionsController } from './controller/subscriptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, Invoice])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService], // PaymentModule needs this
})
export class SubscriptionsModule {}
