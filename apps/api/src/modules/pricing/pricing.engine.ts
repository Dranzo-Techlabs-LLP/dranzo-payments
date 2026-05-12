import { BadRequestException, Injectable } from '@nestjs/common';
import { PricingModelType, PricingTier } from '../../database/entities/pricing-tier.entity';
import { InvoiceLineItem } from '../../database/entities/invoice.entity';
import { BillingCycle, Subscription } from '../../database/entities/subscription.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Client } from '../../database/entities/client.entity';
import { PricingStrategy } from './types';
import { FlatMonthStrategy, FlatYearStrategy } from './strategies/flat.strategy';
import { PerUserMonthStrategy, PerUserYearStrategy } from './strategies/per-user.strategy';
import { TieredPerUserStrategy } from './strategies/tiered.strategy';
import { VolumeStepStrategy } from './strategies/volume.strategy';
import { OneTimeStrategy } from './strategies/one-time.strategy';

export interface InvoicePreview {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  taxBreakdown: { label: string; amount: number }[];
}

@Injectable()
export class PricingEngine {
  private readonly strategies: Map<PricingModelType, PricingStrategy>;

  constructor() {
    const list: PricingStrategy[] = [
      new FlatMonthStrategy(),
      new FlatYearStrategy(),
      new PerUserMonthStrategy(),
      new PerUserYearStrategy(),
      new TieredPerUserStrategy(),
      new VolumeStepStrategy(),
      new OneTimeStrategy(),
    ];
    this.strategies = new Map(list.map((s) => [s.modelType, s]));
  }

  preview(
    subscription: Subscription,
    tier: PricingTier,
    org: Organization,
    client: Client,
    cycle: BillingCycle,
    periodStart: string,
    periodEnd: string,
  ): InvoicePreview {
    const strategy = this.strategies.get(tier.modelType);
    if (!strategy) throw new BadRequestException(`Unsupported pricing model: ${tier.modelType}`);

    tier.baseAmount = Number(tier.baseAmount ?? 0);
    tier.perUnitAmount = Number(tier.perUnitAmount ?? 0);
    if (subscription.customRateOverride != null) {
      subscription.customRateOverride = Number(subscription.customRateOverride);
    }

    const lineItems = strategy.calculate({
      tier,
      units: subscription.unitCount,
      periodStart,
      periodEnd,
      billingCycle: cycle,
      customRateOverride: subscription.customRateOverride ?? undefined,
    });

    const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
    const rawTax = lineItems.reduce((s, l) => s + l.taxAmount, 0);

    const taxBreakdown = this.computeTaxBreakdown(org, client, rawTax);
    const tax = taxBreakdown.reduce((s, t) => s + t.amount, 0);
    const total = subtotal + tax;

    return {
      lineItems,
      subtotal,
      tax,
      total,
      currency: tier.currency,
      taxBreakdown,
    };
  }

  private computeTaxBreakdown(
    org: Organization,
    client: Client,
    rawTax: number,
  ): { label: string; amount: number }[] {
    if (!client.taxId) return [];
    const home = org.homeStateCode?.toUpperCase();
    const ship = client.placeOfSupply?.toUpperCase();
    if (home && ship && home === ship) {
      const half = Math.round(rawTax / 2);
      return [
        { label: 'CGST', amount: half },
        { label: 'SGST', amount: rawTax - half },
      ];
    }
    return [{ label: 'IGST', amount: rawTax }];
  }
}
