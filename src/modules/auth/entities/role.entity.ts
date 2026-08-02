import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Role as RoleEnum } from 'src/common/enums/role.enum';
import { Authorization } from './authorization.entity';

@Entity('role')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'enum', enum: RoleEnum })
  role!: RoleEnum;

  /**
   * Inverse side of Authorization.role — lets you do
   * `roleRepository.findOne({ relations: ['authorizations'] })` to get every
   * permission row for a role in one query, e.g. for an admin screen listing
   * "all permissions this role has".
   *
   * Not currently used anywhere — AuthorizationService and the seed script
   * both query FROM the Authorization side instead (`where: { role: { id } }`),
   * so this exists only for when/if something actually needs `role.authorizations`.
   *
   * Deliberately NO `cascade: true` here. With cascade on, saving a Role that
   * was loaded with its `authorizations` populated lets TypeORM insert/update/
   * DELETE those Authorization rows to match whatever's in the array — an easy
   * way to accidentally wipe out permissions you never meant to touch. Actual
   * cascade-delete (removing a Role's permissions when the Role itself is
   * deleted) already happens at the DB level via `onDelete: 'CASCADE'` on the
   * Authorization side — that's a foreign-key guarantee, independent of this.
   */
  @OneToMany(() => Authorization, (authorization) => authorization.role)
  authorizations!: Authorization[];
}
