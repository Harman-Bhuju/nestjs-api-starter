import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../entities/payment.entity';
import { Repository } from 'typeorm';
import { EsewaService } from '../providers/esewa.service';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PayableType } from '../enums/payable-type.enum';

@Injectable()
export class PaymentService {

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly esewaService: EsewaService,
        
    ) { }

    private async resolveAmount(type: PayableType, id: string): Promise<number> {
        switch (type) {
            case PayableType.INVOICE: {
                const invoice = await this.invoiceRepository.findOneOrFail({ where: { id } });
                return Number(invoice.amountDue);
            }
            // case PayableType.ORDER: ... later
            // case PayableType.APPOINTMENT: ... later
            default:
                throw new BadRequestException('Unsupported payable type');
        }
    }

    /**
   * Step 1 of the flow. Called when the user clicks "pay" on your frontend.
   * We save a PENDING row BEFORE sending the user to eSewa — this is our own
   * record that "this order attempted payment," and it's what lets us match
   * eSewa's later callback back to a specific order/appointment/etc in our system.
   * eSewa's docs never mention storing anything — this part is purely ours.
   */
    async createPayment(dto: CreatePaymentDto) {
        const amount = await this.resolveAmount(dto.payableType, dto.payableId);

        const initiateResponse = await this.esewaService.initiate({ amount, provider: PaymentProvider.ESEWA });

        const payment = this.paymentRepository.create({
            payableType: dto.payableType,
            payableId: dto.payableId,
            transactionUuid: initiateResponse.transactionUuid,
            amount,
            provider: PaymentProvider.ESEWA,
            status: PaymentStatus.PENDING,
        });
        await this.paymentRepository.save(payment);
        return initiateResponse;
    }
    /**
     * Step 2 of the flow. Called when eSewa redirects the browser back to our
     * success_url with ?data=<base64>.
     */
    async handleCallback(data: string) {
        // ask EsewaService to decode + verify the signature + check status === COMPLETE
        const verified = await this.esewaService.verify(data);

        const payment = await this.paymentRepository.findOne({
            where: { transactionUuid: verified.transaction_uuid },
        });

        if (!payment) throw new NotFoundException('Payment record not found');

        // guard against processing the same callback twice (user refreshes the success page,
        // or eSewa retries the redirect) — don't re-run any "grant access" logic twice
        if (payment.status === PaymentStatus.COMPLETE) {
            return payment; // already processed, don't re-run side effects (e.g. don't grant access twice)
        }

        // extra safety: confirm the amount eSewa confirms matches what we originally
        if (Number(verified.total_amount) !== Number(payment.amount)) {
            throw new BadRequestException('Amount mismatch');

        }

        payment.status = PaymentStatus.COMPLETE as any;

        payment.referenceId = verified.transaction_code; // eSewa's own transaction reference, for support/lookups later

        await this.paymentRepository.save(payment);

        return payment;
    }

    /**
     * Safety net for when step 2 never happens (docs: "if a response is not received
     * within five minutes, the status check API can be used to confirm the payment").
     */
    async reconcile(transactionUuid: string) {
        const payment = await this.paymentRepository.findOne({ where: { transactionUuid } });

        if (!payment) throw new NotFoundException('Payment record not found');

        const result = await this.esewaService.checkStatus(transactionUuid, Number(payment.amount));
        // note: decimal columns come back as strings from TypeORM, hence Number(payment.amount)
        payment.status = result.status;

        payment.referenceId = result.ref_id ?? payment.referenceId;

        await this.paymentRepository.save(payment);

        return payment;
    }
}
