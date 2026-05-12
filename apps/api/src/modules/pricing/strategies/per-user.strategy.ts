import { PricingModelType } from '../../../database/entities/pricing-tier.entity';
import { PricingCalcInput, PricingStrategy, lineFor, n } from '../types';

export class PerUserMonthStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.PER_USER_MONTH;
  calculate({ tier, units, customRateOverride }: PricingCalcInput) {
    const unit = n(customRateOverride ?? tier.perUnitAmount);
    const billable = Math.max(units, tier.minUnits ?? 0);
    return [lineFor(`${tier.name} — ${billable} user(s) / month`, billable, unit, parseFloat(tier.taxRate))];
  }
}

export class PerUserYearStrategy implements PricingStrategy {
  readonly modelType = PricingModelType.PER_USER_YEAR;
  calculate({ tier, units, customRateOverride }: PricingCalcInput) {
    const unit = n(customRateOverride ?? tier.perUnitAmount);
    const billable = Math.max(units, tier.minUnits ?? 0);
    return [lineFor(`${tier.name} — ${billable} user(s) / year`, billable, unit, parseFloat(tier.taxRate))];
  }
}
