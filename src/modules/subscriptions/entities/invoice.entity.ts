import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { Subscription } from './subscription.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Subscription, (sub) => sub.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amountDue!: number; // snapshot of Plan.price at purchase time — Payment.resolveAmount() reads this

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.OPEN })
  status!: InvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  periodStart!: Date | null; // set alongside Subscription's, once paid

  @Column({ type: 'timestamptz', nullable: true })
  periodEnd!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}