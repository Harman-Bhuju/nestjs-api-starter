import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from '../service/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';

@Controller('payment')
export class PaymentController {

    constructor(
        private configService: ConfigService,
        private readonly paymentService: PaymentService
    ) { }

    @Post()
    create(@Body() dto: CreatePaymentDto) {
        // Return this to the frontend, which auto-submits it as a form POST to `action`.
        return this.paymentService.createPayment(dto);
    }

    // eSewa redirects here with ?data=<base64> on success
    @Get('success')
    async success(@Query('data') data: string, @Res() res: Response) {
        const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
        try {
            const payment = await this.paymentService.handleCallback(data);
            return res.redirect(`${frontendUrl}/order/${payment.orderId}/success`);
        } catch (err) {
            return res.redirect(`${frontendUrl}/payment-failed`);
        }
    }

    @Get('failure')
    failure(@Res() res: Response) {
        const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
        return res.redirect(`${frontendUrl}/payment-failed`);
    }

    @Get('status/:transactionUuid')
    reconcile(@Param('transactionUuid') transactionUuid: string) {

        return this.paymentService.reconcile(transactionUuid);

    }

    // in frontend
    // simplified frontend polling logic
    // async function pollPaymentStatus(transactionUuid: string) {
    //   const res = await fetch(`/payment/status/${transactionUuid}`);
    //   const payment = await res.json();

    //   if (payment.status === 'COMPLETE') {
    //     // redirect to success page yourself
    //   } else if (['CANCELED', 'NOT_FOUND'].includes(payment.status)) {
    //     // redirect to failure page
    //   } else {
    //     // still PENDING/AMBIGUOUS — poll again in a few seconds, up to some max attempts
    //   }
    // }
    
}
