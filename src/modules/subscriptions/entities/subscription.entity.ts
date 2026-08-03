import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { Plan } from './plan.entity';
import { Invoice } from './invoice.entity';

@Index('idx_subscription_user', ['userId'])
@Index('idx_subscription_status_period', ['status', 'currentPeriodEnd'])
@Entity('subscription')
export class Subscription extends BaseEntity {
  // Plain FK column, declared alongside the `user` relation below — same
  // dual-column pattern as User.roleId/role — so callers that only need the
  // id (e.g. ownership checks) don't have to load the full User relation.
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  planId!: string;

  @ManyToOne(() => Plan, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan!: Plan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status!: SubscriptionStatus;

  // nullable — not "real" until payment confirms and activateFromInvoice() sets them
  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @OneToMany(() => Invoice, (invoice) => invoice.subscription)
  invoices!: Invoice[];
}
