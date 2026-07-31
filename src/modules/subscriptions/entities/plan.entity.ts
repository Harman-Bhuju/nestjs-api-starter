import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';

@Entity('plans')
export class Plan {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'enum', enum: PlanTier })
    tier!: PlanTier;

    // nullable — FREE has no billing cycle at all
    @Column({ type: 'enum', enum: BillingInterval, nullable: true })
    billingInterval!: BillingInterval | null;

    @Column('decimal', { precision: 10, scale: 2 })
    price!: number; // 0 for FREE

    @Column()
    name!: string; // "Pro Monthly", "Advanced Yearly", "Free" — for display on frontend
}