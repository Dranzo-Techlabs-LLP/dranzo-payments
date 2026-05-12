import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney, toMinor } from '@/shared/lib/money';

type Model = 'FLAT_MONTH' | 'FLAT_YEAR' | 'PER_USER_MONTH' | 'PER_USER_YEAR' | 'TIERED_PER_USER' | 'VOLUME_STEP' | 'ONE_TIME';
const MODELS: Model[] = ['FLAT_MONTH', 'FLAT_YEAR', 'PER_USER_MONTH', 'PER_USER_YEAR', 'TIERED_PER_USER', 'VOLUME_STEP', 'ONE_TIME'];

export function Catalog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/catalog/products')).data,
  });

  const [prod, setProd] = useState({ name: '', sku: '', category: '' });
  const [plan, setPlan] = useState({ productId: '', name: '', description: '' });
  const [tier, setTier] = useState({
    planId: '',
    name: '',
    modelType: 'PER_USER_MONTH' as Model,
    currency: 'INR',
    baseAmountRupees: 0,
    perUnitAmountRupees: 500,
    taxRate: 18,
    minUnits: 1,
  });

  const createProduct = useMutation({
    mutationFn: async () => (await api.post('/catalog/products', prod)).data,
    onSuccess: () => {
      setProd({ name: '', sku: '', category: '' });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const createPlan = useMutation({
    mutationFn: async () => (await api.post('/catalog/plans', plan)).data,
    onSuccess: () => {
      setPlan({ productId: '', name: '', description: '' });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const createTier = useMutation({
    mutationFn: async () =>
      (await api.post('/catalog/tiers', {
        planId: tier.planId,
        name: tier.name,
        modelType: tier.modelType,
        currency: tier.currency,
        baseAmount: toMinor(tier.baseAmountRupees),
        perUnitAmount: toMinor(tier.perUnitAmountRupees),
        taxRate: tier.taxRate,
        minUnits: tier.minUnits,
      })).data,
    onSuccess: () => {
      setTier({ ...tier, name: '', perUnitAmountRupees: 500 });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Catalog</h1>
        <p className="text-slate-500">Products → Plans → Pricing Tiers. 7 model types supported.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body space-y-2">
            <h2 className="font-medium">New product</h2>
            <input className="input" placeholder="Name" value={prod.name} onChange={(e) => setProd({ ...prod, name: e.target.value })} />
            <input className="input" placeholder="SKU" value={prod.sku} onChange={(e) => setProd({ ...prod, sku: e.target.value })} />
            <input className="input" placeholder="Category" value={prod.category} onChange={(e) => setProd({ ...prod, category: e.target.value })} />
            <button className="btn btn-primary" disabled={!prod.name || createProduct.isPending} onClick={() => createProduct.mutate()}>
              Add product
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body space-y-2">
            <h2 className="font-medium">New plan</h2>
            <select className="input" value={plan.productId} onChange={(e) => setPlan({ ...plan, productId: e.target.value })}>
              <option value="">— pick product —</option>
              {data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className="input" placeholder="Plan name" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
            <input className="input" placeholder="Description" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
            <button className="btn btn-primary" disabled={!plan.productId || !plan.name || createPlan.isPending} onClick={() => createPlan.mutate()}>
              Add plan
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body space-y-2">
            <h2 className="font-medium">New pricing tier</h2>
            <select className="input" value={tier.planId} onChange={(e) => setTier({ ...tier, planId: e.target.value })}>
              <option value="">— pick plan —</option>
              {data?.flatMap((p: any) => p.plans.map((pl: any) => (
                <option key={pl.id} value={pl.id}>{p.name} — {pl.name}</option>
              )))}
            </select>
            <input className="input" placeholder="Tier name" value={tier.name} onChange={(e) => setTier({ ...tier, name: e.target.value })} />
            <select className="input" value={tier.modelType} onChange={(e) => setTier({ ...tier, modelType: e.target.value as Model })}>
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" placeholder="Base ₹" value={tier.baseAmountRupees} onChange={(e) => setTier({ ...tier, baseAmountRupees: +e.target.value })} />
              <input className="input" type="number" placeholder="Per unit ₹" value={tier.perUnitAmountRupees} onChange={(e) => setTier({ ...tier, perUnitAmountRupees: +e.target.value })} />
              <input className="input" type="number" placeholder="Tax %" value={tier.taxRate} onChange={(e) => setTier({ ...tier, taxRate: +e.target.value })} />
              <input className="input" type="number" placeholder="Min units" value={tier.minUnits} onChange={(e) => setTier({ ...tier, minUnits: +e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={!tier.planId || !tier.name || createTier.isPending} onClick={() => createTier.mutate()}>
              Add tier
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-2">Existing catalog</h2>
          {isLoading ? (
            <p>Loading…</p>
          ) : !data?.length ? (
            <p className="text-slate-500">No products yet.</p>
          ) : (
            <div className="space-y-4">
              {data.map((p: any) => (
                <div key={p.id} className="border rounded-md p-3">
                  <div className="font-medium">{p.name} <span className="text-xs text-slate-500">{p.sku}</span></div>
                  <div className="text-xs text-slate-500 mb-2">{p.description}</div>
                  {p.plans?.map((pl: any) => (
                    <div key={pl.id} className="ml-4 mb-2">
                      <div className="text-sm font-medium">{pl.name}</div>
                      <table className="table mt-1">
                        <thead><tr><th>Tier</th><th>Model</th><th>Base</th><th>Per unit</th><th>Tax</th></tr></thead>
                        <tbody>
                          {pl.tiers?.map((t: any) => (
                            <tr key={t.id}>
                              <td>{t.name}</td>
                              <td><span className="badge bg-slate-100">{t.modelType}</span></td>
                              <td>{fmtMoney(t.baseAmount, t.currency)}</td>
                              <td>{fmtMoney(t.perUnitAmount, t.currency)}</td>
                              <td>{t.taxRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
