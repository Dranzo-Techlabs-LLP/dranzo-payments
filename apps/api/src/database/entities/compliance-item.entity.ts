import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  ComplianceFrequency,
  ComplianceType,
} from './compliance-template.entity';

export enum ComplianceItemStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity({ name: 'compliance_items' })
export class ComplianceItem extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'char', length: 36, name: 'template_id', nullable: true })
  templateId?: string | null;

  @Column({ type: 'char', length: 36, name: 'client_id', nullable: true })
  clientId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'enum', enum: ComplianceType })
  type!: ComplianceType;

  @Column({ type: 'enum', enum: ComplianceFrequency })
  frequency!: ComplianceFrequency;

  @Column({ type: 'date', name: 'next_due_date' })
  nextDueDate!: string;

  @Column({ type: 'int', name: 'reminder_lead_days', default: 7 })
  reminderLeadDays!: number;

  @Column({ type: 'char', length: 36, name: 'owner_id', nullable: true })
  ownerId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  jurisdiction?: string | null;

  @Column({ type: 'enum', enum: ComplianceItemStatus, default: ComplianceItemStatus.ACTIVE })
  status!: ComplianceItemStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
