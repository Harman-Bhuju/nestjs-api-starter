import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PayableType } from '../enums/payable-type.enum';

/**
 * Generic payment record — attaches to whatever PayableType points at
 * (currently only INVOICE) via payableId, rather than a hard FK. This is a
 * polymorphic association: we trade a DB-enforced foreign key for not
 * needing a separate nullable FK column per payable type.
 */
@Index('idx_payment_transactionUuid', ['transactionUuid'])
@Index('idx_payment_payable', ['payableType', 'payableId'])
@Entity('payment')
export class Payment extends BaseEntity {
  @Column({ type: 'enum', enum: PayableType })
  payableType!: PayableType;

  @Column()
  payableId!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  transactionUuid!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider!: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId?: string | null;
}
