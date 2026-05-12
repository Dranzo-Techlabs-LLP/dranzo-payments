import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Plan } from './plan.entity';

export const bigIntT = {
  to: (n: number | null | undefined) => n,
  from: (v: string | number | null): number | null => {
    if (v == null) return null;
    return typeof v === 'string' ? parseInt(v, 10) : v;
  },
};

export enum PricingModelType {
  FLAT_MONTH = 'FLAT_MONTH',
  FLAT_YEAR = 'FLAT_YEAR',
  PER_USER_MONTH = 'PER_USER_MONTH',
  PER_USER_YEAR = 'PER_USER_YEAR',
  TIERED_PER_USER = 'TIERED_PER_USER',
  VOLUME_STEP = 'VOLUME_STEP',
  ONE_TIME = 'ONE_TIME',
}

export interface TierSlab {
  upTo: number | null; // null = infinity
  perUnitAmount: number; // minor units
}

@Entity({ name: 'pricing_tiers' })
export class PricingTier extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'plan_id' })
  planId!: string;

  @ManyToOne(() => Plan, (p) => p.tiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: PricingModelType, name: 'model_type' })
  modelType!: PricingModelType;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'bigint', name: 'base_amount', default: 0, transformer: bigIntT })
  baseAmount!: number;

  @Column({ type: 'bigint', name: 'per_unit_amount', default: 0, transformer: bigIntT })
  perUnitAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', default: 18.0 })
  taxRate!: string;

  @Column({ type: 'json', name: 'tier_slabs', nullable: true })
  tierSlabs?: TierSlab[] | null;

  @Column({ type: 'int', name: 'min_units', nullable: true })
  minUnits?: number | null;

  @Column({ type: 'int', name: 'max_units', nullable: true })
  maxUnits?: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}

