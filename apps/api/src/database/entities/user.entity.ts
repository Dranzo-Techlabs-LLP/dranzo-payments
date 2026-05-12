import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Role } from '../../common/enums/role.enum';
import { RefreshToken } from './refresh-token.entity';

@Entity({ name: 'users' })
@Unique('uq_users_org_email', ['organizationId', 'email'])
export class User extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, (o) => o.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.VIEWER,
  })
  role!: Role;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'datetime', precision: 6, name: 'last_login_at', nullable: true })
  lastLoginAt?: Date | null;

  @OneToMany(() => RefreshToken, (t) => t.user)
  refreshTokens?: RefreshToken[];
}
