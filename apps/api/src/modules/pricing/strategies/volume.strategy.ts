import { BadRequestException } from '@nestjs/common';
import { PricingModelType } from '../../../database/entities/pricing-tier.entity';
import { PricingCalcInput, PricingStrategy, lineFor, n } from '../types';

export class VolumeStepStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.VOLUME_STEP;
  calculate({ tier, units }: PricingCalcInput) {
    if (!tier.tierSlabs?.length) {
      throw new BadRequestException('VOLUME_STEP requires tier_slabs');
    }
    const slabs = [...tier.tierSlabs].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    const billable = Math.max(units, tier.minUnits ?? 0);
    const slab = slabs.find((s) => s.upTo === null || billable <= s.upTo);
    if (!slab) {
      throw new BadRequestException('No slab matches the unit count');
    }
    return [
      lineFor(`${tier.name} — volume rate (${billable} units)`, billable, n(slab.perUnitAmount), parseFloat(tier.taxRate)),
    ];
  }
}
