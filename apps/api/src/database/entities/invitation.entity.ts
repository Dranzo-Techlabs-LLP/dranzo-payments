import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Role } from '../../common/enums/role.enum';

@Entity({ name: 'invitations' })
@Unique('uq_invitations_org_email_open', ['organizationId', 'email'])
export class Invitation extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'enum', enum: Role, default: Role.VIEWER })
  role!: Role;

  @Index()
  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'datetime', precision: 6, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'char', length: 36, name: 'invited_by' })
  invitedBy!: string;

  @Column({ type: 'datetime', precision: 6, name: 'accepted_at', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'char', length: 36, name: 'accepted_user_id', nullable: true })
  acceptedUserId?: string | null;
}
