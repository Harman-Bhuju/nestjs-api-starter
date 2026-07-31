import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PaymentProvider } from "../enums/payment-provider.enum";
import { PaymentStatus } from "../enums/payment-status.enum";
import { PayableType } from "../enums/payable-type.enum";

@Index('idx_transactionUuid', ['transactionUuid'])
@Index('idx_orderId', ['orderId'])
@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PayableType })
  payableType!: PayableType;

  @Column({ type: 'varchar', length: 100 })
  payableId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  transactionUuid!: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider!: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenceId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}