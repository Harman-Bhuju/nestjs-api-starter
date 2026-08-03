import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentController } from './controller/payment.controller';
import { PaymentService } from './service/payment.service';
import { Payment } from './entities/payment.entity';
import { PaymentFactory } from './factory/payment.factory';
import { EsewaService } from './providers/esewa.service';
import { SubscriptionsModule } from 'src/modules/subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    SubscriptionsModule, // exports SubscriptionsService — needed for resolveAmount/activateFromInvoice/markInvoiceFailed
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentFactory, EsewaService],
})
export class PaymentModule {}
