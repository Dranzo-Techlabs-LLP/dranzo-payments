import { PricingModelType } from '../../../database/entities/pricing-tier.entity';
import { PricingCalcInput, PricingStrategy, lineFor, n } from '../types';

export class FlatMonthStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.FLAT_MONTH;
  calculate({ tier, customRateOverride }: PricingCalcInput) {
    const unit = n(customRateOverride ?? tier.baseAmount);
    return [lineFor(`${tier.name} (flat / month)`, 1, unit, parseFloat(tier.taxRate))];
  }
}

export class FlatYearStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.FLAT_YEAR;
  calculate({ tier, customRateOverride }: PricingCalcInput) {
    const unit = n(customRateOverride ?? tier.baseAmount);
    return [lineFor(`${tier.name} (flat / year)`, 1, unit, parseFloat(tier.taxRate))];
  }
}
