import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY';
const CYCLES: Cycle[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY'];

type SubStatus = 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';
const STATUSES: SubStatus[] = ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED'];

interface CreateForm {
  clientId: string;
  pricingTierId: string;
  billingCycle: Cycle;
  startDate: string;
  unitCount: number;
  reminderLeadDays: number;
  autoRenew: boolean;
}

interface EditForm {
  unitCount: number;
  reminderLeadDays: number;
  autoRenew: boolean;
  status: SubStatus;
  notes: string;
}

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

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateForm>({
    clientId: '',
    pricingTierId: '',
    billingCycle: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    unitCount: 1,
    reminderLeadDays: 7,
    autoRenew: true,
  });
  const [edit, setEdit] = useState<EditForm>({ unitCount: 1, reminderLeadDays: 7, autoRenew: true, status: 'ACTIVE', notes: '' });

  const create = useMutation({
    mutationFn: async () => {
      const tier = tiers.find((t) => t.id === form.pricingTierId);
      return (await api.post('/subscriptions', { ...form, planId: tier?.planId })).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setCreating(false); },
  });

  const update = useMutation({
    mutationFn: async () => editingId ? (await api.patch(`/subscriptions/${editingId}`, edit)).data : null,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setEditingId(null); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setConfirmId(null); },
  });

  const generateInvoice = useMutation({
    mutationFn: async (subscriptionId: string) =>
      (await api.post('/invoices/generate', { subscriptionId, dueOffsetDays: 7 })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  function openEdit(s: any) {
    setEdit({
      unitCount: s.unitCount,
      reminderLeadDays: s.reminderLeadDays,
      autoRenew: s.autoRenew,
      status: s.status,
      notes: s.notes ?? '',
    });
    setEditingId(s.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-slate-500">Map a client to a plan + pricing tier + billing cycle.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New subscription</button>
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
                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-secondary py-1 text-xs" onClick={() => generateInvoice.mutate(s.id)} disabled={generateInvoice.isPending}>Invoice</button>
                        <button className="btn btn-secondary py-1 text-xs" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmId(s.id)}>Delete</button>
                      </div>
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

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New subscription"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.clientId || !form.pricingTierId || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} />
            Auto-renew
          </label>
        </div>
      </Modal>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit subscription"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" type="number" placeholder="Unit count" value={edit.unitCount} onChange={(e) => setEdit({ ...edit, unitCount: +e.target.value })} />
          <input className="input" type="number" placeholder="Reminder lead days" value={edit.reminderLeadDays} onChange={(e) => setEdit({ ...edit, reminderLeadDays: +e.target.value })} />
          <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as SubStatus })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={edit.autoRenew} onChange={(e) => setEdit({ ...edit, autoRenew: e.target.checked })} />
            Auto-renew
          </label>
          <textarea className="input md:col-span-2 min-h-[80px]" placeholder="Notes" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDelete
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && del.mutate(confirmId)}
        title="Delete subscription?"
        message="Subscription is soft-removed. Existing invoices stay."
        busy={del.isPending}
      />
    </div>
  );
}
