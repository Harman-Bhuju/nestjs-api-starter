import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';

/**
 * Catalog of purchasable plans. FREE is not something users purchase — it's
 * simply what SubscriptionsService.getCurrentTier() returns when no ACTIVE
 * subscription exists — but a FREE row can still be listed here for display
 * purposes (e.g. showing a pricing table with a "Free" column).
 */
@Index(['tier'])
@Entity('plan')
export class Plan extends BaseEntity {
  @Column({ type: 'enum', enum: PlanTier })
  tier!: PlanTier;

  // nullable — FREE has no billing cycle at all
  @Column({ type: 'enum', enum: BillingInterval, nullable: true })
  billingInterval!: BillingInterval | null;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number; // 0 for FREE

  @Column()
  name!: string; // "Pro Monthly", "Advanced Yearly", "Free" — for display
}
