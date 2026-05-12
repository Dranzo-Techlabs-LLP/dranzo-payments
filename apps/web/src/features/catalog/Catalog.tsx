import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney, toMinor } from '@/shared/lib/money';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

const MODEL_HINTS: Record<string, string> = {
  FLAT_MONTH: 'Single fixed fee per client per month. Ignores user count.',
  FLAT_YEAR: 'Single fixed fee per client per year. Ignores user count.',
  PER_USER_MONTH: 'Per-unit amount × number of users, billed monthly.',
  PER_USER_YEAR: 'Per-unit amount × number of users, billed yearly.',
  TIERED_PER_USER: 'Slab-based per-user — different rate per slab band.',
  VOLUME_STEP: 'All units charged at a single slab rate based on total count.',
  ONE_TIME: 'Non-recurring fee, added once on the first invoice.',
};

type Model = 'FLAT_MONTH' | 'FLAT_YEAR' | 'PER_USER_MONTH' | 'PER_USER_YEAR' | 'TIERED_PER_USER' | 'VOLUME_STEP' | 'ONE_TIME';
const MODELS: Model[] = ['FLAT_MONTH', 'FLAT_YEAR', 'PER_USER_MONTH', 'PER_USER_YEAR', 'TIERED_PER_USER', 'VOLUME_STEP', 'ONE_TIME'];

type Kind = 'product' | 'plan' | 'tier';

export function Catalog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/catalog/products')).data,
  });

  const [modal, setModal] = useState<{ kind: Kind; id: string | null; planId?: string; productId?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: Kind; id: string } | null>(null);

  const [prod, setProd] = useState({ name: '', sku: '', category: '', description: '', isActive: true });
  const [plan, setPlan] = useState({ productId: '', name: '', description: '', isActive: true });
  const [tier, setTier] = useState({
    planId: '',
    name: '',
    modelType: 'PER_USER_MONTH' as Model,
    currency: 'INR',
    baseAmountRupees: 0,
    perUnitAmountRupees: 500,
    taxRate: 18,
    minUnits: 1,
    isActive: true,
  });

  const upsertProduct = useMutation({
    mutationFn: async () => {
      const body = prod;
      return modal?.id
        ? (await api.patch(`/catalog/products/${modal.id}`, body)).data
        : (await api.post('/catalog/products', body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setModal(null);
    },
  });
  const upsertPlan = useMutation({
    mutationFn: async () => {
      return modal?.id
        ? (await api.patch(`/catalog/plans/${modal.id}`, plan)).data
        : (await api.post('/catalog/plans', plan)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setModal(null);
    },
  });
  const upsertTier = useMutation({
    mutationFn: async () => {
      const body = {
        planId: tier.planId,
        name: tier.name,
        modelType: tier.modelType,
        currency: tier.currency,
        baseAmount: toMinor(tier.baseAmountRupees),
        perUnitAmount: toMinor(tier.perUnitAmountRupees),
        taxRate: tier.taxRate,
        minUnits: tier.minUnits,
        isActive: tier.isActive,
      };
      return modal?.id
        ? (await api.patch(`/catalog/tiers/${modal.id}`, body)).data
        : (await api.post('/catalog/tiers', body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setModal(null);
    },
  });

  const del = useMutation({
    mutationFn: async (vars: { kind: Kind; id: string }) =>
      api.delete(`/catalog/${vars.kind}s/${vars.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setConfirm(null);
    },
  });

  function newProduct() {
    setProd({ name: '', sku: '', category: '', description: '', isActive: true });
    setModal({ kind: 'product', id: null });
  }
  function editProduct(p: any) {
    setProd({ name: p.name, sku: p.sku ?? '', category: p.category ?? '', description: p.description ?? '', isActive: !!p.isActive });
    setModal({ kind: 'product', id: p.id });
  }
  function newPlan(productId?: string) {
    setPlan({ productId: productId ?? '', name: '', description: '', isActive: true });
    setModal({ kind: 'plan', id: null });
  }
  function editPlan(pl: any) {
    setPlan({ productId: pl.productId, name: pl.name, description: pl.description ?? '', isActive: !!pl.isActive });
    setModal({ kind: 'plan', id: pl.id });
  }
  function newTier(planId?: string) {
    setTier({
      planId: planId ?? '',
      name: '',
      modelType: 'PER_USER_MONTH',
      currency: 'INR',
      baseAmountRupees: 0,
      perUnitAmountRupees: 500,
      taxRate: 18,
      minUnits: 1,
      isActive: true,
    });
    setModal({ kind: 'tier', id: null });
  }
  function editTier(t: any) {
    setTier({
      planId: t.planId,
      name: t.name,
      modelType: t.modelType,
      currency: t.currency,
      baseAmountRupees: (Number(t.baseAmount) || 0) / 100,
      perUnitAmountRupees: (Number(t.perUnitAmount) || 0) / 100,
      taxRate: parseFloat(t.taxRate),
      minUnits: t.minUnits ?? 0,
      isActive: !!t.isActive,
    });
    setModal({ kind: 'tier', id: t.id });
  }

  function save() {
    if (modal?.kind === 'product') upsertProduct.mutate();
    if (modal?.kind === 'plan') upsertPlan.mutate();
    if (modal?.kind === 'tier') upsertTier.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catalog</h1>
          <p className="text-slate-500">Products → Plans → Pricing tiers. 7 model types supported.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => newPlan()}>+ Plan</button>
          <button className="btn btn-secondary" onClick={() => newTier()}>+ Tier</button>
          <button className="btn btn-primary" onClick={newProduct}>+ Product</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <p>Loading…</p>
          ) : !data?.length ? (
            <p className="text-slate-500">No products yet.</p>
          ) : (
            <div className="space-y-4">
              {data.map((p: any) => (
                <div key={p.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{p.name} <span className="text-xs text-slate-500">{p.sku}</span></div>
                      <div className="text-xs text-slate-500 mb-2">{p.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary py-1 text-xs" onClick={() => newPlan(p.id)}>+ Plan</button>
                      <button className="btn btn-secondary py-1 text-xs" onClick={() => editProduct(p)}>Edit</button>
                      <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirm({ kind: 'product', id: p.id })}>Delete</button>
                    </div>
                  </div>
                  {p.plans?.map((pl: any) => (
                    <div key={pl.id} className="ml-4 mt-2 border-l pl-3">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium">{pl.name}</div>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary py-1 text-xs" onClick={() => newTier(pl.id)}>+ Tier</button>
                          <button className="btn btn-secondary py-1 text-xs" onClick={() => editPlan(pl)}>Edit</button>
                          <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirm({ kind: 'plan', id: pl.id })}>Delete</button>
                        </div>
                      </div>
                      <table className="table mt-1">
                        <thead><tr><th>Tier</th><th>Model</th><th>Base</th><th>Per unit</th><th>Tax</th><th></th></tr></thead>
                        <tbody>
                          {pl.tiers?.map((t: any) => (
                            <tr key={t.id}>
                              <td>{t.name}</td>
                              <td><span className="badge bg-slate-100">{t.modelType}</span></td>
                              <td>{fmtMoney(t.baseAmount, t.currency)}</td>
                              <td>{fmtMoney(t.perUnitAmount, t.currency)}</td>
                              <td>{t.taxRate}%</td>
                              <td>
                                <div className="flex gap-2 justify-end">
                                  <button className="btn btn-secondary py-1 text-xs" onClick={() => editTier(t)}>Edit</button>
                                  <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirm({ kind: 'tier', id: t.id })}>Delete</button>
                                </div>
                              </td>
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

      <Modal
        open={modal?.kind === 'product'}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit product' : 'New product'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!prod.name || upsertProduct.isPending}>
              {upsertProduct.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <Field label="Name" required>
          <input className="input" value={prod.name} onChange={(e) => setProd({ ...prod, name: e.target.value })} />
        </Field>
        <Field label="SKU" hint="Internal identifier (optional).">
          <input className="input" value={prod.sku} onChange={(e) => setProd({ ...prod, sku: e.target.value })} />
        </Field>
        <Field label="Category" hint="e.g. SaaS, IT Services, Hardware.">
          <input className="input" value={prod.category} onChange={(e) => setProd({ ...prod, category: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="input min-h-[80px]" value={prod.description} onChange={(e) => setProd({ ...prod, description: e.target.value })} />
        </Field>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={prod.isActive} onChange={(e) => setProd({ ...prod, isActive: e.target.checked })} />
          Active
        </label>
      </Modal>

      <Modal
        open={modal?.kind === 'plan'}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit plan' : 'New plan'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!plan.productId || !plan.name || upsertPlan.isPending}>
              {upsertPlan.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <Field label="Product" required>
          <select className="input" value={plan.productId} onChange={(e) => setPlan({ ...plan, productId: e.target.value })} disabled={!!modal?.id}>
            <option value="">— pick product —</option>
            {data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Plan name" required>
          <input className="input" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="input min-h-[80px]" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
        </Field>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={plan.isActive} onChange={(e) => setPlan({ ...plan, isActive: e.target.checked })} />
          Active
        </label>
      </Modal>

      <Modal
        open={modal?.kind === 'tier'}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit pricing tier' : 'New pricing tier'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!tier.planId || !tier.name || upsertTier.isPending}>
              {upsertTier.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <Field label="Plan" required>
          <select className="input" value={tier.planId} onChange={(e) => setTier({ ...tier, planId: e.target.value })} disabled={!!modal?.id}>
            <option value="">— pick plan —</option>
            {data?.flatMap((p: any) => p.plans.map((pl: any) => (
              <option key={pl.id} value={pl.id}>{p.name} — {pl.name}</option>
            )))}
          </select>
        </Field>
        <Field label="Tier name" required hint="Human label for this rate (e.g. 'Standard / user / month').">
          <input className="input" value={tier.name} onChange={(e) => setTier({ ...tier, name: e.target.value })} />
        </Field>
        <Field label="Rate model" required hint={MODEL_HINTS[tier.modelType]}>
          <select className="input" value={tier.modelType} onChange={(e) => setTier({ ...tier, modelType: e.target.value as Model })}>
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base amount (₹)" hint="Used by FLAT_MONTH / FLAT_YEAR / ONE_TIME.">
            <input className="input" type="number" min={0} value={tier.baseAmountRupees} onChange={(e) => setTier({ ...tier, baseAmountRupees: +e.target.value })} />
          </Field>
          <Field label="Per-unit amount (₹)" hint="Used by PER_USER_*; rate per user per cycle.">
            <input className="input" type="number" min={0} value={tier.perUnitAmountRupees} onChange={(e) => setTier({ ...tier, perUnitAmountRupees: +e.target.value })} />
          </Field>
          <Field label="Tax rate (%)" hint="GST slab — 0, 5, 12, 18, 28.">
            <input className="input" type="number" min={0} step={0.5} value={tier.taxRate} onChange={(e) => setTier({ ...tier, taxRate: +e.target.value })} />
          </Field>
          <Field label="Minimum units" hint="Billed at least this many units even if actual is lower.">
            <input className="input" type="number" min={0} value={tier.minUnits} onChange={(e) => setTier({ ...tier, minUnits: +e.target.value })} />
          </Field>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={tier.isActive} onChange={(e) => setTier({ ...tier, isActive: e.target.checked })} />
          Active
        </label>
      </Modal>

      <ConfirmDelete
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && del.mutate(confirm)}
        title={`Delete ${confirm?.kind}?`}
        message={confirm?.kind === 'product' ? 'Plans and tiers under this product remain but lose their parent.' : 'Soft delete only.'}
        busy={del.isPending}
      />
    </div>
  );
}
