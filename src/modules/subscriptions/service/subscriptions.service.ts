import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { Subscription } from '../entities/subscription.entity';
import { Invoice } from '../entities/invoice.entity';
import { Plan } from '../entities/plan.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { PurchaseSubscriptionDto } from '../dto/purchase-subscription.dto';
import { PlanResponseDto } from '../dto/plan-response.dto';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { PurchaseSubscriptionResponseDto } from '../dto/purchase-subscription-response.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async createPlan(dto: CreatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.planRepository.save(
      this.planRepository.create({
        id: Plan.generateId(),
        tier: dto.tier,
        billingInterval:
          dto.tier === PlanTier.FREE ? null : (dto.billingInterval ?? null),
        price: dto.price,
        name: dto.name,
      }),
    );
    return PlanResponseDto.fromEntity(plan);
  }

  async listPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.planRepository.find({ order: { price: 'ASC' } });
    return plans.map((plan) => PlanResponseDto.fromEntity(plan));
  }

  /**
   * Step 1 — user picks a paid plan. Creates Subscription (PENDING, no
   * period dates yet) + its Invoice (OPEN). The frontend takes invoice.id
   * and POSTs it to POST /payment as { payableType: 'INVOICE', payableId }.
   */
  async purchase(
    userId: string,
    dto: PurchaseSubscriptionDto,
  ): Promise<PurchaseSubscriptionResponseDto> {
    const plan = await this.planRepository.findOne({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan.tier === PlanTier.FREE) {
      throw new BadRequestException(
        'Free tier does not require purchase — it applies automatically when no active subscription exists',
      );
    }

    const subscription = await this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        id: Subscription.generateId(),
        userId,
        planId: plan.id,
        status: SubscriptionStatus.PENDING,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      }),
    );

    const invoice = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        id: Invoice.generateId(),
        subscriptionId: subscription.id,
        amountDue: plan.price,
        status: InvoiceStatus.OPEN,
        periodStart: null,
        periodEnd: null,
      }),
    );

    subscription.plan = plan;
    return {
      subscription: SubscriptionResponseDto.fromEntity(subscription),
      invoice: InvoiceResponseDto.fromEntity(invoice),
    };
  }

  /**
   * Called by PaymentService.resolveAmount() for payableType === INVOICE.
   * Also enforces ownership: throws if this invoice's subscription does not
   * belong to `userId`, so a caller can never pay toward someone else's invoice.
   */
  async getAmountDue(invoiceId: string, userId: string): Promise<number> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.assertInvoiceOwnership(invoice, userId);
    return Number(invoice.amountDue);
  }

  private async assertInvoiceOwnership(
    invoice: Invoice,
    userId: string,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: invoice.subscriptionId },
    });
    if (!subscription || subscription.userId !== userId) {
      throw new ForbiddenException('This invoice does not belong to you');
    }
  }

  /**
   * Step 2 — called by PaymentService.handleCallback() once eSewa confirms
   * payment for an INVOICE payable. The ONLY place a subscription becomes
   * ACTIVE and gets real period dates.
   */
  async activateFromInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: { subscription: { plan: true } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // idempotency guard — callback/reconcile could theoretically fire twice
    if (invoice.status === InvoiceStatus.PAID) return;

    const plan = invoice.subscription.plan;
    const now = new Date();
    const periodEnd =
      plan.billingInterval === BillingInterval.YEARLY
        ? this.addMonths(now, 12)
        : this.addMonths(now, 1);

    invoice.status = InvoiceStatus.PAID;
    invoice.periodStart = now;
    invoice.periodEnd = periodEnd;
    await this.invoiceRepository.save(invoice);

    const subscription = invoice.subscription;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    await this.subscriptionRepository.save(subscription);
  }

  /** Called by PaymentService when eSewa reports a terminal failure for an INVOICE payable. */
  async markInvoiceFailed(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) return; // never downgrade a paid invoice
    invoice.status = InvoiceStatus.FAILED;
    await this.invoiceRepository.save(invoice);
    // subscription stays PENDING — the user can retry by purchasing again,
    // or you can add a "retry payment" endpoint that reuses this same invoice
  }

  /** Derives what tier a user is currently on. Call this anywhere you need to gate a feature. */
  async getCurrentTier(userId: string): Promise<PlanTier> {
    const active = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
    });
    return active ? active.plan.tier : PlanTier.FREE;
  }

  /** Every subscription (past and present) the given user has ever had — audit/history view. */
  async listMine(userId: string): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    return subscriptions.map((sub) => SubscriptionResponseDto.fromEntity(sub));
  }

  /**
   * Hourly cron: flips anything past its period to EXPIRED. No invoice is
   * created, no charge is attempted, no cancellation logic needed — the user
   * simply falls back to the FREE tier (see getCurrentTier) until they
   * explicitly purchase again.
   */
  @Cron('0 * * * *')
  async expireEndedSubscriptions(): Promise<void> {
    const ended = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: LessThanOrEqual(new Date()),
      },
    });
    for (const sub of ended) {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(sub);
    }
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}
