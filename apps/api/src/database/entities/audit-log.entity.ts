import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'audit_logs' })
@Index('ix_audit_org_created', ['organizationId', 'createdAt'])
@Index('ix_audit_entity', ['entity', 'entityId'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'char', length: 36, name: 'actor_id', nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 64 })
  entity!: string;

  @Column({ type: 'char', length: 36, name: 'entity_id', nullable: true })
  entityId?: string | null;

  @Column({ type: 'json', nullable: true })
  before?: unknown;

  @Column({ type: 'json', nullable: true })
  after?: unknown;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;
}
