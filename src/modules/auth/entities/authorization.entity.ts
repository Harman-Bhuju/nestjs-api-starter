import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Role } from './role.entity';

/**
 * One row = "this role may call these HTTP methods on this path".
 * `path` supports Express-style params (":id") and wildcards ("*"),
 * compiled to RegExp by AuthorizationService.
 */
@Entity('authorization')
// Composite index on (role, path) — AuthorizationService's core lookup is
// "find rows for role.id X" (see getAuthorizationsForRole), and each role
// typically checks a handful of distinct paths. This index speeds up exactly
// that access pattern instead of a full table scan per lookup.
@Index(['role', 'path'])
export class Authorization extends BaseEntity {
  @Column()
  path!: string;

  @Column('simple-json')
  methods!: string[];

  // Owning side of the relation — this is where the `roleId` foreign key
  // column actually lives (see @JoinColumn below). Role.authorizations is
  // just the inverse/read-only side; it holds no column of its own.
  //
  // onDelete: 'CASCADE' — a DATABASE-level guarantee (via the FK constraint,
  // not TypeORM's own `cascade` option): if a Role row is deleted, Postgres
  // automatically deletes every Authorization row that pointed to it. This
  // is what keeps permission rows from being orphaned if a role is removed,
  // independent of whether Role.authorizations ever gets loaded in app code.
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;
}
