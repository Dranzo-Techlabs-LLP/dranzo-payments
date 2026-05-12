import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';
import { Link } from 'react-router-dom';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY';
const CYCLES: Cycle[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY'];

type SubStatus = 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';
const STATUSES: SubStatus[] = ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED'];

type Model = 'FLAT_MONTH' | 'FLAT_YEAR' | 'PER_USER_MONTH' | 'PER_USER_YEAR' | 'TIERED_PER_USER' | 'VOLUME_STEP' | 'ONE_TIME';

interface TierOption {
  id: string;
  planId: string;
  label: string;
  modelType: Model;
  productName: string;
  planName: string;
}

interface CreateForm {
  clientId: string;
  pricingTierId: string;
  billingCycle: Cycle;
  startDate: string;
  unitCount: number;
  reminderLeadDays: number;
  autoRenew: boolean;
  notes: string;
}

interface EditForm {
  unitCount: number;
  reminderLeadDays: number;
  autoRenew: boolean;
  status: SubStatus;
  notes: string;
  billingCycle: Cycle;
  nextRenewalDate: string;
}

function isPerUser(m: Model) {
  return m === 'PER_USER_MONTH' || m === 'PER_USER_YEAR' || m === 'TIERED_PER_USER' || m === 'VOLUME_STEP';
}

const CREATE_EMPTY: CreateForm = {
  clientId: '',
  pricingTierId: '',
  billingCycle: 'MONTHLY',
  startDate: new Date().toISOString().slice(0, 10),
  unitCount: 1,
  reminderLeadDays: 7,
  autoRenew: true,
  notes: '',
};

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

  const tiers: TierOption[] = useMemo(() => {
    const result: TierOption[] = [];
    for (const p of products.data ?? []) for (const pl of p.plans ?? []) for (const t of pl.tiers ?? []) {
      result.push({
        id: t.id,
        planId: pl.id,
        label: `${p.name} / ${pl.name} / ${t.name}`,
        modelType: t.modelType,
        productName: p.name,
        planName: pl.name,
      });
    }
    return result;
  }, [products.data]);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateForm>(CREATE_EMPTY);
  const [edit, setEdit] = useState<EditForm>({
    unitCount: 1, reminderLeadDays: 7, autoRenew: true, status: 'ACTIVE', notes: '',
    billingCycle: 'MONTHLY', nextRenewalDate: '',
  });
  const [preview, setPreview] = useState<{ subtotal: number; tax: number; total: number; currency: string } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const selectedTier = tiers.find((t) => t.id === form.pricingTierId);

  // Live preview when key inputs change
  useEffect(() => {
    if (!creating || !form.pricingTierId) {
      setPreview(null);
      return;
    }
    const ctl = new AbortController();
    setPreviewBusy(true);
    api.post('/pricing/preview', {
      pricingTierId: form.pricingTierId,
      clientId: form.clientId || undefined,
      unitCount: form.unitCount,
      billingCycle: form.billingCycle,
    }, { signal: ctl.signal })
      .then((r) => setPreview({ subtotal: r.data.subtotal, tax: r.data.tax, total: r.data.total, currency: r.data.currency }))
      .catch(() => setPreview(null))
      .finally(() => setPreviewBusy(false));
    return () => ctl.abort();
  }, [creating, form.pricingTierId, form.unitCount, form.clientId, form.billingCycle]);

  const create = useMutation({
    mutationFn: async () => {
      const tier = tiers.find((t) => t.id === form.pricingTierId);
      return (await api.post('/subscriptions', { ...form, planId: tier?.planId })).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setCreating(false); setForm(CREATE_EMPTY); },
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
      billingCycle: s.billingCycle,
      nextRenewalDate: s.nextRenewalDate,
    });
    setEditingId(s.id);
  }

  function dayOfMonth(d: string): number {
    return d ? parseInt(d.slice(8, 10), 10) : 0;
  }
  function monthDayLabel(d: string): string {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00Z`);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  // Group tiers for select: per-client vs per-user models, easier picking
  const tierGroups = useMemo(() => {
    return {
      perClient: tiers.filter((t) => !isPerUser(t.modelType)),
      perUser: tiers.filter((t) => isPerUser(t.modelType)),
    };
  }, [tiers]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-slate-500">Per-client (flat) or per-user, billed monthly/quarterly/yearly.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(CREATE_EMPTY); setCreating(true); }}>+ New subscription</button>
      </div>

      <div className="card">
        <div className="card-body overflow-auto">
          {subs.isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Plan</th><th>Rate model</th><th>Cycle</th><th>Units</th><th>Fee / cycle</th><th>Renewal</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {subs.data?.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.client?.displayName}</td>
                    <td>{s.plan?.name}</td>
                    <td><span className="badge bg-slate-100">{s.pricingTier?.modelType}</span></td>
                    <td>{s.billingCycle}</td>
                    <td>{s.unitCount}</td>
                    <td className="font-medium">
                      {s.feePreview ? fmtMoney(s.feePreview.total, s.feePreview.currency) : '—'}
                      {s.feePreview && s.feePreview.tax > 0 && (
                        <div className="text-[10px] text-slate-500">
                          {fmtMoney(s.feePreview.subtotal, s.feePreview.currency)} + {fmtMoney(s.feePreview.tax, s.feePreview.currency)} tax
                        </div>
                      )}
                    </td>
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
                  <tr><td colSpan={9} className="text-center text-slate-500 py-4">No subscriptions.</td></tr>
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
        maxWidth="max-w-3xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.clientId || !form.pricingTierId || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Create subscription'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Client" required className="md:col-span-2">
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">— select client —</option>
              {clients.data?.map((c: any) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </Field>

          <Field
            label="Pricing tier"
            required
            hint="Rates live in Catalog → Product → Plan → Tier."
            className="md:col-span-2"
          >
            <select className="input" value={form.pricingTierId} onChange={(e) => setForm({ ...form, pricingTierId: e.target.value })}>
              <option value="">— select pricing tier —</option>
              {tierGroups.perClient.length > 0 && (
                <optgroup label="Per-client (flat fee)">
                  {tierGroups.perClient.map((t) => (
                    <option key={t.id} value={t.id}>{t.label} — {t.modelType}</option>
                  ))}
                </optgroup>
              )}
              {tierGroups.perUser.length > 0 && (
                <optgroup label="Per-user / volume">
                  {tierGroups.perUser.map((t) => (
                    <option key={t.id} value={t.id}>{t.label} — {t.modelType}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {tiers.length === 0 ? (
              <p className="text-xs text-amber-700 mt-1">
                No pricing tiers defined. <Link to="/catalog" className="underline">Create one in Catalog</Link> first.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Need a new rate? <Link to="/catalog" className="text-brand-600 underline">Open Catalog</Link>.
              </p>
            )}
          </Field>

          <Field label="Billing cycle" required>
            <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as Cycle })}>
              {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Start date" required>
            <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>

          <Field
            label={selectedTier && isPerUser(selectedTier.modelType) ? 'User count' : 'Unit count'}
            hint={selectedTier && !isPerUser(selectedTier.modelType) ? 'Ignored for flat per-client tiers.' : undefined}
          >
            <input className="input" type="number" min={1} value={form.unitCount} onChange={(e) => setForm({ ...form, unitCount: +e.target.value })} />
          </Field>

          <Field label="Reminder lead time (days before renewal)">
            <input className="input" type="number" min={0} value={form.reminderLeadDays} onChange={(e) => setForm({ ...form, reminderLeadDays: +e.target.value })} />
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} />
            Auto-renew at each cycle end
          </label>
        </div>

        {selectedTier && (
          <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 mb-2 font-medium">Charge preview</div>
            {previewBusy ? (
              <div className="text-sm text-slate-500">Calculating…</div>
            ) : preview ? (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[11px] text-slate-500">Subtotal</div>
                  <div>{fmtMoney(preview.subtotal, preview.currency)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Tax</div>
                  <div>{fmtMoney(preview.tax, preview.currency)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total / cycle</div>
                  <div className="font-semibold">{fmtMoney(preview.total, preview.currency)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Pick client + tier to preview.</div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit subscription"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Billing cycle"
            hint="How often invoices fire. Changing this anchors the period from the renewal date below."
          >
            <select className="input" value={edit.billingCycle} onChange={(e) => setEdit({ ...edit, billingCycle: e.target.value as Cycle })}>
              {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field
            label="Next renewal date"
            hint={
              edit.billingCycle === 'MONTHLY'
                ? `Bills on the ${dayOfMonth(edit.nextRenewalDate) || '—'} of every month.`
                : edit.billingCycle === 'YEARLY'
                ? `Bills on ${monthDayLabel(edit.nextRenewalDate) || '—'} every year.`
                : 'Bills on this date, then advances one cycle each renewal.'
            }
          >
            <input className="input" type="date" value={edit.nextRenewalDate} onChange={(e) => setEdit({ ...edit, nextRenewalDate: e.target.value })} />
          </Field>
          <Field label="Reminder lead days" hint="Days before renewal the task card is auto-created.">
            <input className="input" type="number" min={0} value={edit.reminderLeadDays} onChange={(e) => setEdit({ ...edit, reminderLeadDays: +e.target.value })} />
          </Field>
          <Field label="Auto-renew">
            <label className="text-sm flex items-center gap-2 h-10">
              <input type="checkbox" checked={edit.autoRenew} onChange={(e) => setEdit({ ...edit, autoRenew: e.target.checked })} />
              Renew automatically each cycle
            </label>
          </Field>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t pt-3">Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Unit / user count">
            <input className="input" type="number" min={1} value={edit.unitCount} onChange={(e) => setEdit({ ...edit, unitCount: +e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as SubStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea className="input min-h-[80px]" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </Field>
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
