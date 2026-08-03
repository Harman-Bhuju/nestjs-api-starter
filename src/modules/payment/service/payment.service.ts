import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Payment } from '../entities/payment.entity';
import { EsewaService } from '../providers/esewa.service';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PayableType } from '../enums/payable-type.enum';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { SubscriptionsService } from 'src/modules/subscriptions/service/subscriptions.service';

// eSewa statuses that mean "this payment is not going to complete" — used to
// decide when reconcile() should tell the domain layer (SubscriptionsService)
// to mark the underlying invoice FAILED instead of leaving it OPEN forever.
const TERMINAL_FAILURE_STATUSES: PaymentStatus[] = [
  PaymentStatus.CANCELED,
  PaymentStatus.NOT_FOUND,
];

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly esewaService: EsewaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Resolves how much is owed for a given payable, AND enforces ownership —
   * throws if `userId` doesn't own the underlying resource. Add a new `case`
   * here (and in handleDomainSuccess/handleDomainFailure below) the day a
   * second PayableType (ORDER, APPOINTMENT) is implemented.
   */
  private async resolveAmount(
    type: PayableType,
    id: string,
    userId: string,
  ): Promise<number> {
    switch (type) {
      case PayableType.INVOICE:
        return this.subscriptionsService.getAmountDue(id, userId);
      default:
        throw new BadRequestException('Unsupported payable type');
    }
  }

  /** Runs once a payment for this payable is confirmed COMPLETE. */
  private async handleDomainSuccess(
    type: PayableType,
    id: string,
  ): Promise<void> {
    switch (type) {
      case PayableType.INVOICE:
        await this.subscriptionsService.activateFromInvoice(id);
        return;
      default:
        return;
    }
  }

  /** Runs once a payment for this payable is confirmed to have terminally failed. */
  private async handleDomainFailure(
    type: PayableType,
    id: string,
  ): Promise<void> {
    switch (type) {
      case PayableType.INVOICE:
        await this.subscriptionsService.markInvoiceFailed(id);
        return;
      default:
        return;
    }
  }

  /**
   * Step 1 of the flow. Called when the authenticated user clicks "pay".
   * Saves a PENDING row BEFORE sending the user to eSewa — this is our own
   * record that "this payable attempted payment," and it's what lets us
   * match eSewa's later callback back to a specific invoice/order/etc.
   */
  async createPayment(userId: string, dto: CreatePaymentDto) {
    const amount = await this.resolveAmount(
      dto.payableType,
      dto.payableId,
      userId,
    );

    const initiateResponse = await this.esewaService.initiate({ amount });

    const payment = this.paymentRepository.create({
      id: Payment.generateId(),
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
  async handleCallback(data: string): Promise<Payment> {
    // decode + verify signature + confirm status === COMPLETE (throws otherwise)
    const verified = await this.esewaService.verify(data);

    const payment = await this.paymentRepository.findOne({
      where: { transactionUuid: verified.transaction_uuid },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    // guard against processing the same callback twice (refresh, eSewa retry)
    if (payment.status === PaymentStatus.COMPLETE) {
      return payment;
    }

    if (Number(verified.total_amount) !== Number(payment.amount)) {
      throw new BadRequestException('Amount mismatch');
    }

    payment.status = PaymentStatus.COMPLETE;
    payment.referenceId = verified.transaction_code;
    await this.paymentRepository.save(payment);

    await this.handleDomainSuccess(payment.payableType, payment.payableId);

    return payment;
  }

  /**
   * Safety net for when step 2 never happens (docs: "if a response is not
   * received within five minutes, the status check API can be used to
   * confirm the payment"). Also re-checks ownership so a caller can't probe
   * someone else's transactionUuid.
   */
  async reconcile(transactionUuid: string, userId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionUuid },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    // ownership check — throws ForbiddenException if this payable isn't userId's
    await this.resolveAmount(payment.payableType, payment.payableId, userId);

    const result = await this.esewaService.checkStatus(
      transactionUuid,
      Number(payment.amount),
    );
    // decimal columns come back as strings from TypeORM, hence Number(payment.amount)

    const previousStatus = payment.status;
    payment.status = result.status;
    payment.referenceId = result.ref_id ?? payment.referenceId;
    await this.paymentRepository.save(payment);

    if (previousStatus !== PaymentStatus.COMPLETE) {
      if (payment.status === PaymentStatus.COMPLETE) {
        await this.handleDomainSuccess(payment.payableType, payment.payableId);
      } else if (TERMINAL_FAILURE_STATUSES.includes(payment.status)) {
        await this.handleDomainFailure(payment.payableType, payment.payableId);
      }
    }

    return payment;
  }
}
