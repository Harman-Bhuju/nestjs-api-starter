import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { FileMetaType } from 'src/common/enums/file-metatype.enum';
import { FileType } from 'src/common/enums/file-type.enum';
import { User } from 'src/modules/users/entities/user.entity';


/**
 * One row per uploaded file. Only PROFILE (see FileType) is wired up right
 * now — profileUser is the OWNING side of the OneToOne with User, so this
 * is where the FK actually lives.
 */
@Entity('file')
export class File extends BaseEntity {
  @Column()
  fileUrl!: string;

  // Cloudinary's asset id — needed to delete/replace the asset later.
  @Column()
  publicId!: string;

  @Index()
  @Column({ type: 'enum', enum: FileType })
  type!: FileType;

  @Column({ type: 'enum', enum: FileMetaType })
  metaType!: FileMetaType;

  @OneToOne(() => User, (user) => user.profileImage, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  profileUser?: User | null;
}
