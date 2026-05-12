import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ComplianceType {
  TAX_FILING = 'TAX_FILING',
  CONTRACT_REVIEW = 'CONTRACT_REVIEW',
  KYC = 'KYC',
  LICENSE = 'LICENSE',
  SLA = 'SLA',
  AUDIT = 'AUDIT',
}

export enum ComplianceFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALFYEARLY = 'HALFYEARLY',
  YEARLY = 'YEARLY',
  ONE_OFF = 'ONE_OFF',
}

@Entity({ name: 'compliance_templates' })
export class ComplianceTemplate extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'enum', enum: ComplianceType })
  type!: ComplianceType;

  @Column({ type: 'enum', enum: ComplianceFrequency })
  frequency!: ComplianceFrequency;

  @Column({ type: 'int', name: 'day_of_month', nullable: true })
  dayOfMonth?: number | null;

  @Column({ type: 'int', name: 'month_of_year', nullable: true })
  monthOfYear?: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  jurisdiction?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}
