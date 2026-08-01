import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/entities/user.entity';

@Entity('refresh_token')
export class RefreshToken extends BaseEntity {
  // Refresh tokens are looked up by hash on every /refresh-token call,
  // so this needs an index — plain FK column is not enough on its own.
  @Index()
  @Column()
  hashToken!: string;

  @Column({ type: 'timestamp' })
  expiryAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
