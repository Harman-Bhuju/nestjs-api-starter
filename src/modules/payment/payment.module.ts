import { Module } from '@nestjs/common';
import { PaymentController } from './controller/payment.controller';
import { PaymentService } from './service/payment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentFactory } from './factory/payment.factory';
import { EsewaService } from './providers/esewa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,

    ])

  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentFactory,
    EsewaService
  ]
})
export class PaymentModule { }
