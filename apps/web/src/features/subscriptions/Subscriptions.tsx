import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY' | 'CUSTOM';
const CYCLES: Cycle[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY'];

export function Subscriptions() {
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => (await api.get('/subscriptions')).data,
  });
  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });
  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/catalog/products')).data,
  });
  const tiers = useMemo(() => {
    const result: { id: string; label: string; planId: string }[] = [];
    for (const p of products.data ?? []) for (const pl of p.plans ?? []) for (const t of pl.tiers ?? []) {
      result.push({ id: t.id, label: `${p.name} / ${pl.name} / ${t.name} (${t.modelType})`, planId: pl.id });
    }
    return result;
  }, [products.data]);

  const [form, setForm] = useState({
    clientId: '',
    pricingTierId: '',
    billingCycle: 'MONTHLY' as Cycle,
    startDate: new Date().toISOString().slice(0, 10),
    unitCount: 1,
    reminderLeadDays: 7,
    autoRenew: true,
  });

  const create = useMutation({
    mutationFn: async () => {
      const tier = tiers.find((t) => t.id === form.pricingTierId);
      const body = { ...form, planId: tier?.planId };
      return (await api.post('/subscriptions', body)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const generateInvoice = useMutation({
    mutationFn: async (subscriptionId: string) =>
      (await api.post('/invoices/generate', { subscriptionId, dueOffsetDays: 7 })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-slate-500">Map a client to a plan + pricing tier + billing cycle.</p>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="font-medium">New subscription</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">— pick client —</option>
              {clients.data?.map((c: any) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
            <select className="input" value={form.pricingTierId} onChange={(e) => setForm({ ...form, pricingTierId: e.target.value })}>
              <option value="">— pick pricing tier —</option>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as Cycle })}>
              {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <input className="input" type="number" placeholder="Unit count" value={form.unitCount} onChange={(e) => setForm({ ...form, unitCount: +e.target.value })} />
            <input className="input" type="number" placeholder="Reminder lead days" value={form.reminderLeadDays} onChange={(e) => setForm({ ...form, reminderLeadDays: +e.target.value })} />
          </div>
          {create.isError && <p className="text-red-600 text-sm">{(create.error as any)?.response?.data?.message || 'Failed'}</p>}
          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={!form.clientId || !form.pricingTierId || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Create subscription'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {subs.isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Plan</th><th>Model</th><th>Cycle</th><th>Units</th><th>Renewal</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {subs.data?.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.client?.displayName}</td>
                    <td>{s.plan?.name}</td>
                    <td><span className="badge bg-slate-100">{s.pricingTier?.modelType}</span></td>
                    <td>{s.billingCycle}</td>
                    <td>{s.unitCount}</td>
                    <td>{fmtDate(s.nextRenewalDate)}</td>
                    <td><span className="badge bg-slate-100">{s.status}</span></td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        disabled={generateInvoice.isPending}
                        onClick={() => generateInvoice.mutate(s.id)}
                      >
                        Generate invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {!subs.data?.length && (
                  <tr><td colSpan={8} className="text-center text-slate-500 py-4">No subscriptions.</td></tr>
                )}
              </tbody>
            </table>
          )}
          {generateInvoice.data && (
            <p className="mt-2 text-green-700 text-sm">
              Invoice {generateInvoice.data.invoiceNo} — {fmtMoney(generateInvoice.data.total, generateInvoice.data.currency)} generated.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
