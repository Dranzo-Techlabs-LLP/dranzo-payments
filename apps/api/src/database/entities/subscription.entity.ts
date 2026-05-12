import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Client } from './client.entity';
import { Plan } from './plan.entity';
import { PricingTier, bigIntT } from './pricing-tier.entity';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALFYEARLY = 'HALFYEARLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'subscriptions' })
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 36, name: 'organization_id' })
  organizationId!: string;

  @Index()
  @Column({ type: 'char', length: 36, name: 'client_id' })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @Column({ type: 'char', length: 36, name: 'plan_id' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ type: 'char', length: 36, name: 'pricing_tier_id' })
  pricingTierId!: string;

  @ManyToOne(() => PricingTier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pricing_tier_id' })
  pricingTier?: PricingTier;

  @Column({ type: 'enum', enum: BillingCycle, name: 'billing_cycle' })
  billingCycle!: BillingCycle;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string;

  @Column({ type: 'date', name: 'next_renewal_date' })
  nextRenewalDate!: string;

  @Column({ type: 'date', name: 'current_period_start' })
  currentPeriodStart!: string;

  @Column({ type: 'date', name: 'current_period_end' })
  currentPeriodEnd!: string;

  @Column({ type: 'int', name: 'unit_count', default: 1 })
  unitCount!: number;

  @Column({ type: 'bigint', name: 'custom_rate_override', nullable: true, transformer: bigIntT })
  customRateOverride?: number | null;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'int', name: 'reminder_lead_days', default: 7 })
  reminderLeadDays!: number;

  @Column({ type: 'boolean', name: 'auto_renew', default: true })
  autoRenew!: boolean;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
