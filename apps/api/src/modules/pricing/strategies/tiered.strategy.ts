import { BadRequestException } from '@nestjs/common';
import {
  PricingModelType,
  TierSlab,
} from '../../../database/entities/pricing-tier.entity';
import { InvoiceLineItem } from '../../../database/entities/invoice.entity';
import { PricingCalcInput, PricingStrategy, lineFor, n } from '../types';

export class TieredPerUserStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.TIERED_PER_USER;
  calculate({ tier, units }: PricingCalcInput): InvoiceLineItem[] {
    if (!tier.tierSlabs?.length) {
      throw new BadRequestException('TIERED_PER_USER requires tier_slabs');
    }
    const slabs = [...tier.tierSlabs].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    const taxRate = parseFloat(tier.taxRate);
    let remaining = Math.max(units, tier.minUnits ?? 0);
    let used = 0;
    const lines: InvoiceLineItem[] = [];
    for (const slab of slabs) {
      if (remaining <= 0) break;
      const cap = slab.upTo === null ? Infinity : slab.upTo - used;
      const take = Math.min(remaining, cap);
      if (take > 0) {
        lines.push(
          lineFor(
            `${tier.name} — ${take} user(s) @ slab up to ${slab.upTo ?? '∞'}`,
            take,
            n(slab.perUnitAmount),
            taxRate,
          ),
        );
        remaining -= take;
        used += take;
      }
    }
    if (remaining > 0) {
      throw new BadRequestException('Slabs do not cover the unit count — add an open-ended top slab');
    }
    return lines;
  }
}
