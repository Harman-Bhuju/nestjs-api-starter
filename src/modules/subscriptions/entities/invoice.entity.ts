import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { Subscription } from './subscription.entity';

@Index('idx_invoice_subscription', ['subscriptionId'])
@Entity('invoice')
export class Invoice extends BaseEntity {
  @Column()
  subscriptionId!: string;

  @ManyToOne(() => Subscription, (sub) => sub.invoices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @Column('decimal', { precision: 10, scale: 2 })
  amountDue!: number; // snapshot of Plan.price at purchase time — Payment reads this via SubscriptionsService.getAmountDue

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.OPEN })
  status!: InvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  periodStart!: Date | null; // set alongside Subscription's, once paid

  @Column({ type: 'timestamptz', nullable: true })
  periodEnd!: Date | null;
}
