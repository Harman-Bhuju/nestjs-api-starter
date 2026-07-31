import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { Invoice } from '../entities/invoice.entity';
import { Plan } from '../entities/plan.entity';
import { PurchaseSubscriptionDto } from '../dto/purchase-subscription.dto';
import { PlanTier } from '../enums/plan-tier.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Injectable()
export class SubscriptionsService {
    constructor(
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Plan)
        private readonly planRepository: Repository<Plan>,
    ) { }

    /**
     * Step 1 — user picks a paid plan. Creates Subscription (PENDING, no period, dates yet) + its Invoice (OPEN). Returns invoice.id for the frontend to hand to POST /payment as { payableType: 'INVOICE', payableId: invoice.id }.
     */

    async purchase(dto: PurchaseSubscriptionDto) {
        const plan = await this.planRepository.findOneOrFail({ where: { id: dto.planId } });

        if (plan.tier === PlanTier.FREE) {
            throw new BadRequestException('Free tier does not require purchase — it applies automatically when no active subscription exists');
        }
        const subscription = await this.subscriptionRepository.save(
            this.subscriptionRepository.create({
                userId: dto.userId,
                planId: plan.id,
                status: SubscriptionStatus.PENDING,
                currentPeriodStart: null,
                currentPeriodEnd: null,
            }),
        );

        const invoice = await this.invoiceRepository.save(
            this.invoiceRepository.create({
                subscriptionId: subscription.id,
                amountDue: plan.price,
                status: InvoiceStatus.OPEN,
                periodStart: null,
                periodEnd: null,
            }),
        );

        return { subscription, invoice };
    }

    /** Payment.resolveAmount() calls this for payableType === INVOICE */
    async getAmountDue(invoiceId: string): Promise<number> {
        const invoice = await this.invoiceRepository.findOneOrFail({ where: { id: invoiceId } });
        return Number(invoice.amountDue);
    }


    /**
     * Step 2 — called by PaymentService.handleCallback() once eSewa confirms
     * payment for an INVOICE payable. This is the ONLY place a subscription
     * becomes ACTIVE and gets real period dates.
     */
    async activateFromInvoice(invoiceId: string) {

        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['subscription', 'subscription.plan'],
        });
        
        if (!invoice) throw new NotFoundException('Invoice not found');

        // idempotency guard — callback could theoretically fire twice
        if (invoice.status === InvoiceStatus.PAID) return invoice.subscription;

        const plan = invoice.subscription.plan;
        const now = new Date();
        const periodEnd = plan.billingInterval === BillingInterval.YEARLY
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

        return subscription;
    }



}
