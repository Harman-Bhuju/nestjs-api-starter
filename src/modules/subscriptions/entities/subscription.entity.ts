import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { Plan } from './plan.entity';
import { Invoice } from './invoice.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // once you have a User entity, make this a real relation (@ManyToOne(() => User))
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'planId' })
  plan!: Plan;

  @Column({ type: 'uuid' })
  planId!: string;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
  status!: SubscriptionStatus;

  // nullable — not "real" until payment confirms and activateFromInvoice() sets them
  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @OneToMany(() => Invoice, (invoice) => invoice.subscription)
  invoices!: Invoice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}