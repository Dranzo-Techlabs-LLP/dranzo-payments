import {
  PricingModelType,
  PricingTier,
} from '../../database/entities/pricing-tier.entity';
import {
  BillingCycle,
  Subscription,
} from '../../database/entities/subscription.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Client } from '../../database/entities/client.entity';
import { PricingEngine } from './pricing.engine';

function makeTier(p: Partial<PricingTier>): PricingTier {
  return Object.assign(new PricingTier(), {
    name: 'Test',
    currency: 'INR',
    baseAmount: 0,
    perUnitAmount: 0,
    taxRate: '18.00',
    tierSlabs: null,
    minUnits: null,
    maxUnits: null,
    ...p,
  });
}
function makeSub(units: number, custom?: number): Subscription {
  return Object.assign(new Subscription(), {
    unitCount: units,
    customRateOverride: custom ?? null,
    billingCycle: BillingCycle.MONTHLY,
  });
}
function makeOrg(state = 'KA'): Organization {
  return Object.assign(new Organization(), { homeStateCode: state });
}
function makeClient(gstin: string | null, place = 'KA'): Client {
  return Object.assign(new Client(), { taxId: gstin, placeOfSupply: place });
}

describe('PricingEngine', () => {
  const engine = new PricingEngine();

  it('FLAT_MONTH → 1 line, base amount, CGST+SGST on intra-state', () => {
    const tier = makeTier({ modelType: PricingModelType.FLAT_MONTH, baseAmount: 10000 });
    const r = engine.preview(makeSub(1), tier, makeOrg('KA'), makeClient('29ABC', 'KA'), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    expect(r.subtotal).toBe(10000);
    expect(r.tax).toBe(1800);
    expect(r.taxBreakdown.map((t) => t.label)).toEqual(['CGST', 'SGST']);
    expect(r.total).toBe(11800);
  });

  it('PER_USER_MONTH → quantity * unit, IGST on inter-state', () => {
    const tier = makeTier({ modelType: PricingModelType.PER_USER_MONTH, perUnitAmount: 500 });
    const r = engine.preview(makeSub(20), tier, makeOrg('KA'), makeClient('07XYZ', 'DL'), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    expect(r.subtotal).toBe(10000);
    expect(r.taxBreakdown[0].label).toBe('IGST');
    expect(r.total).toBe(11800);
  });

  it('TIERED_PER_USER → splits across slabs', () => {
    const tier = makeTier({
      modelType: PricingModelType.TIERED_PER_USER,
      tierSlabs: [
        { upTo: 10, perUnitAmount: 500 },
        { upTo: 50, perUnitAmount: 400 },
        { upTo: null, perUnitAmount: 300 },
      ],
    });
    const r = engine.preview(makeSub(60), tier, makeOrg('KA'), makeClient(null), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    // 10*500 + 40*400 + 10*300 = 5000 + 16000 + 3000 = 24000
    expect(r.subtotal).toBe(24000);
    expect(r.tax).toBe(0); // no GSTIN → no tax
    expect(r.total).toBe(24000);
  });

  it('VOLUME_STEP → single rate from matching slab', () => {
    const tier = makeTier({
      modelType: PricingModelType.VOLUME_STEP,
      tierSlabs: [
        { upTo: 10, perUnitAmount: 500 },
        { upTo: 50, perUnitAmount: 400 },
        { upTo: null, perUnitAmount: 300 },
      ],
    });
    const r = engine.preview(makeSub(30), tier, makeOrg('KA'), makeClient(null), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    // 30 * 400 = 12000
    expect(r.subtotal).toBe(12000);
  });

  it('customRateOverride beats baseAmount', () => {
    const tier = makeTier({ modelType: PricingModelType.FLAT_MONTH, baseAmount: 10000 });
    const r = engine.preview(makeSub(1, 7500), tier, makeOrg('KA'), makeClient(null), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    expect(r.subtotal).toBe(7500);
  });

  it('ONE_TIME → single line, base amount', () => {
    const tier = makeTier({ modelType: PricingModelType.ONE_TIME, baseAmount: 50000 });
    const r = engine.preview(makeSub(1), tier, makeOrg('KA'), makeClient(null), BillingCycle.MONTHLY, '2026-01-01', '2026-01-31');
    expect(r.subtotal).toBe(50000);
    expect(r.lineItems[0].description).toContain('one-time');
  });
});
