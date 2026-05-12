import { PricingModelType, PricingTier } from '../../database/entities/pricing-tier.entity';
import { BillingCycle } from '../../database/entities/subscription.entity';
import { InvoiceLineItem } from '../../database/entities/invoice.entity';

export interface PricingCalcInput {
  tier: PricingTier;
  units: number;
  periodStart: string;
  periodEnd: string;
  billingCycle: BillingCycle;
  customRateOverride?: number | null;
}

export interface PricingStrategy {
  readonly modelType: PricingModelType;
  calculate(input: PricingCalcInput): InvoiceLineItem[];
}

export function lineFor(description: string, qty: number, unit: number | string, taxRate: number): InvoiceLineItem {
  const u = Number(unit);
  const amount = qty * u;
  const taxAmount = Math.round((amount * taxRate) / 100);
  return {
    description,
    quantity: qty,
    unitAmount: u,
    amount,
    taxRate,
    taxAmount,
  };
}

export function n(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'string' ? parseInt(v, 10) : v;
}
