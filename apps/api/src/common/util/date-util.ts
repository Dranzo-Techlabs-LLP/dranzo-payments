import { BillingCycle } from '../../database/entities/subscription.entity';

export function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return isoDate(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return isoDate(d);
}

export function periodEnd(start: string, cycle: BillingCycle): string {
  const next = nextRenewal(start, cycle);
  return addDays(next, -1);
}

export function nextRenewal(start: string, cycle: BillingCycle): string {
  switch (cycle) {
    case BillingCycle.MONTHLY:
      return addMonths(start, 1);
    case BillingCycle.QUARTERLY:
      return addMonths(start, 3);
    case BillingCycle.HALFYEARLY:
      return addMonths(start, 6);
    case BillingCycle.YEARLY:
      return addMonths(start, 12);
    case BillingCycle.CUSTOM:
      return addMonths(start, 1);
  }
}

/** Indian FY: Apr–Mar. Returns e.g. "2627" for FY ending Mar-2027. */
export function fyCode(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const m = d.getUTCMonth(); // 0..11
  const y = d.getUTCFullYear();
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
}

/** Stable identifier for a cycle on a subscription/compliance item. */
export function cycleKey(periodStart: string): string {
  return periodStart;
}
