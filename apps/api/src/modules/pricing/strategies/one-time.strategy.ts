import { PricingModelType } from '../../../database/entities/pricing-tier.entity';
import { PricingCalcInput, PricingStrategy, lineFor, n } from '../types';

export class OneTimeStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.ONE_TIME;
  calculate({ tier, customRateOverride }: PricingCalcInput) {
    const unit = n(customRateOverride ?? tier.baseAmount);
    return [lineFor(`${tier.name} (one-time)`, 1, unit, parseFloat(tier.taxRate))];
  }
}
