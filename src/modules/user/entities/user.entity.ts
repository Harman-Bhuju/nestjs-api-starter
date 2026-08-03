import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Gender } from 'src/common/enums/gender.enum';
import { RefreshToken } from 'src/modules/auth/entities/refresh-token.entity';
import { File } from 'src/modules/file/entities/file.entity';
import { Role } from 'src/modules/auth/entities/role.entity';

/**
 * Generic user. Keep this the single source of truth for "who can log in".
 * If a role needs extra fields (e.g. a Driver's licence number), create a
 * separate entity with a OneToOne back to User rather than bloating this
 * table — see the commented example at the bottom of this file.
 */
@Index('idx_user_role', ['roleId'])
@Entity('user')
export class User extends BaseEntity {
  @Column()
  firstName!: string;

  @Column({ type: 'varchar', nullable: true })
  middleName!: string | null;

  @Column()
  lastName!: string;

  /** Convenience accessor only — not a DB column. */
  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(' ');
  }

  @Index({ unique: true })
  @Column()
  email!: string;

  // Never selected by default in queries that return user data to clients —
  // always strip it manually before sending a response (see UserService).
  // With select: false, TypeORM won't fetch it by default.
  @Column({ select: false })
  password!: string;

  // Plain FK column, declared alongside the `role` relation below so callers
  // that only need the id (e.g. building a JWT payload) don't have to load
  @Column()
  roleId!: string;

  @ManyToOne(() => Role, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Column({ type: 'varchar', nullable: true })
  contactNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', nullable: true })
  province!: string | null;

  @Column({ type: 'varchar', nullable: true })
  district!: string | null;

  // Optional — collected at registration or via profile update, never required.
  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ type: 'varchar', length: 6, nullable: true, select: false })
  otpCode!: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  otpExpiryTime!: Date | null;

  @Column({ type: 'int', default: 0, select: false })
  otpAttempts!: number;

  @Column({ type: 'timestamp', nullable: true, select: false })
  otpLockedUntil!: Date | null;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  // Distinct from isEmailVerified — this flag is for the
  // forgot-password OTP flow specifically, not initial registration.
  @Column({ type: 'boolean', default: false })
  isPasswordResetVerified!: boolean;

  // Bumping this instantly invalidates every access & refresh token
  // the user currently holds (used by logoutAllDevices / password change).
  @Column({ type: 'int', default: 0 })
  tokenVersion!: number;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  // Owning side of the relation lives on File (profileUser + JoinColumn),
  // so this side just needs the inverse mapstring, no JoinColumn here.
  @OneToOne(() => File, (file) => file.profileUser, {
    nullable: true,
    eager: false,
  })
  profileImage!: File | null;

  /**
   * Example of extending per-role, instead of adding nullable columns here:
   *
   * @Entity('driver')
   * export class Driver extends BaseEntity {
   *   @OneToOne(() => User) @JoinColumn() user!: User;
   *   @Column() licenceNumber!: string;
   * }
   */
}
