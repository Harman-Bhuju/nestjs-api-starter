import {
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StringUtils } from '../utils/string.utils';

/**
 * Every entity in the app should extend this instead of redeclaring
 * id / createdAt / updatedAt. Keeps schema conventions consistent
 * and avoids copy-pasted boilerplate across entities.
 */
export abstract class BaseEntity {
  @PrimaryColumn()
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  static generateId(length = 8): string {
    return StringUtils.generateRandomAlphaNumeric(length);
  }
}
