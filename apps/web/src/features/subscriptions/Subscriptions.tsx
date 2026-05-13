import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

type Cycle = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY';
const CYCLES: Cycle[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY'];

type SubStatus = 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';
const STATUSES: SubStatus[] = ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED'];

type Model =
  | 'FLAT_MONTH'
  | 'FLAT_YEAR'
  | 'PER_USER_MONTH'
  | 'PER_USER_YEAR'
  | 'ONE_TIME';
const MODELS: { value: Model; label: string; hint: string; perUser: boolean }[] = [
  { value: 'FLAT_MONTH', label: 'Flat per client / month', hint: 'Fixed monthly fee regardless of user count.', perUser: false },
  { value: 'FLAT_YEAR', label: 'Flat per client / year', hint: 'Fixed yearly fee regardless of user count.', perUser: false },
  { value: 'PER_USER_MONTH', label: 'Per user / month', hint: 'Rate × user count, billed monthly.', perUser: true },
  { value: 'PER_USER_YEAR', label: 'Per user / year', hint: 'Rate × user count, billed yearly.', perUser: true },
  { value: 'ONE_TIME', label: 'One-time fee', hint: 'Non-recurring; charged once.', perUser: false },
];

interface CreateForm {
  clientId: string;
  billingCycle: Cycle;
  startDate: string;
  modelType: Model;
  rateRupees: string; // base or per-unit, depending on model
  taxRate: number;
  unitCount: number;
  reminderLeadDays: number;
  autoRenew: boolean;
  notes: string;
  rateLabel: string;
}

interface EditForm extends CreateForm {
  status: SubStatus;
  nextRenewalDate: string;
  customRateRupees: string;
}

const CREATE_EMPTY: CreateForm = {
  clientId: '',
  billingCycle: 'MONTHLY',
  startDate: new Date().toISOString().slice(0, 10),
  modelType: 'PER_USER_MONTH',
  rateRupees: '500',
  taxRate: 18,
  unitCount: 1,
  reminderLeadDays: 7,
  autoRenew: true,
  notes: '',
  rateLabel: '',
};

const EDIT_EMPTY: EditForm = {
  ...CREATE_EMPTY,
  status: 'ACTIVE',
  nextRenewalDate: '',
  customRateRupees: '',
};

function modelDef(m: Model) {
  return MODELS.find((x) => x.value === m)!;
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

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string>('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<{ subtotal: number; tax: number; total: number; currency: string } | null>(null);

  const [form, setForm] = useState<CreateForm>(CREATE_EMPTY);
  const [edit, setEdit] = useState<EditForm>(EDIT_EMPTY);

  const [preview, setPreview] = useState<{ subtotal: number; tax: number; total: number; currency: string } | null>(null);

  // Live preview during create — compute locally to avoid round trips.
  useEffect(() => {
    if (!creating) {
      setPreview(null);
      return;
    }
    const def = modelDef(form.modelType);
    const rate = parseFloat(form.rateRupees) || 0;
    const ratePaise = Math.round(rate * 100);
    const subtotal = def.perUser ? Math.max(1, form.unitCount) * ratePaise : ratePaise;
    const tax = Math.round((subtotal * (form.taxRate || 0)) / 100);
    setPreview({ subtotal, tax, total: subtotal + tax, currency: 'INR' });
  }, [creating, form.modelType, form.rateRupees, form.taxRate, form.unitCount]);

  // Live preview during edit — same client-side math, plus custom override.
  useEffect(() => {
    if (!editingId) {
      setEditPreview(null);
      return;
    }
    const def = modelDef(edit.modelType);
    const baseRate = parseFloat(edit.rateRupees) || 0;
    const override = edit.customRateRupees.trim() === '' ? null : parseFloat(edit.customRateRupees);
    const effectiveRate = override != null && !Number.isNaN(override) ? override : baseRate;
    const ratePaise = Math.round(effectiveRate * 100);
    const subtotal = def.perUser ? Math.max(1, edit.unitCount) * ratePaise : ratePaise;
    const tax = Math.round((subtotal * (edit.taxRate || 0)) / 100);
    setEditPreview({ subtotal, tax, total: subtotal + tax, currency: 'INR' });
  }, [editingId, edit.modelType, edit.rateRupees, edit.taxRate, edit.unitCount, edit.customRateRupees]);

  const create = useMutation({
    mutationFn: async () => {
      const def = modelDef(form.modelType);
      const ratePaise = Math.round((parseFloat(form.rateRupees) || 0) * 100);
      const body: any = {
        clientId: form.clientId,
        billingCycle: form.billingCycle,
        startDate: form.startDate,
        modelType: form.modelType,
        taxRate: form.taxRate,
        unitCount: form.unitCount,
        reminderLeadDays: form.reminderLeadDays,
        autoRenew: form.autoRenew,
        notes: form.notes || undefined,
        rateLabel: form.rateLabel || undefined,
      };
      if (def.perUser) {
        body.perUnitAmount = ratePaise;
        body.baseAmount = 0;
      } else {
        body.baseAmount = ratePaise;
        body.perUnitAmount = 0;
      }
      return (await api.post('/subscriptions', body)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setCreating(false); setForm(CREATE_EMPTY); },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingId) return null;
      const def = modelDef(edit.modelType);
      const ratePaise = Math.round((parseFloat(edit.rateRupees) || 0) * 100);
      const body: any = {
        unitCount: edit.unitCount,
        reminderLeadDays: edit.reminderLeadDays,
        autoRenew: edit.autoRenew,
        status: edit.status,
        notes: edit.notes,
        billingCycle: edit.billingCycle,
        nextRenewalDate: edit.nextRenewalDate,
        modelType: edit.modelType,
        taxRate: edit.taxRate,
        rateLabel: edit.rateLabel || undefined,
      };
      if (def.perUser) {
        body.perUnitAmount = ratePaise;
        body.baseAmount = 0;
      } else {
        body.baseAmount = ratePaise;
        body.perUnitAmount = 0;
      }
      if (edit.customRateRupees.trim() === '') body.customRateOverride = null;
      else body.customRateOverride = Math.round(parseFloat(edit.customRateRupees) * 100);
      return (await api.patch(`/subscriptions/${editingId}`, body)).data;
    },
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
    const tier = s.pricingTier;
    const model = (tier?.modelType ?? 'PER_USER_MONTH') as Model;
    const def = modelDef(model);
    const rateMinor = def.perUser ? Number(tier?.perUnitAmount ?? 0) : Number(tier?.baseAmount ?? 0);
    setEditingClient(s.client?.displayName ?? '');
    setEdit({
      clientId: s.clientId,
      billingCycle: s.billingCycle,
      startDate: s.startDate,
      modelType: model,
      rateRupees: String(rateMinor / 100),
      taxRate: parseFloat(tier?.taxRate ?? '0'),
      unitCount: s.unitCount,
      reminderLeadDays: s.reminderLeadDays,
      autoRenew: s.autoRenew,
      notes: s.notes ?? '',
      rateLabel: tier?.name && !tier.name.startsWith('__') ? tier.name : '',
      status: s.status,
      nextRenewalDate: s.nextRenewalDate,
      customRateRupees: s.customRateOverride != null ? String(Number(s.customRateOverride) / 100) : '',
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-slate-500">Per-client (flat) or per-user, billed monthly/quarterly/yearly. Rate is set on each subscription.</p>
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
                <tr><th>Client</th><th>Rate model</th><th>Rate</th><th>Cycle</th><th>Units</th><th>Fee / cycle</th><th>Renewal</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {subs.data?.map((s: any) => {
                  const t = s.pricingTier;
                  const def = t ? MODELS.find((m) => m.value === t.modelType) : null;
                  const rateMinor = def?.perUser ? Number(t?.perUnitAmount ?? 0) : Number(t?.baseAmount ?? 0);
                  return (
                    <tr key={s.id}>
                      <td>{s.client?.displayName}</td>
                      <td><span className="badge bg-slate-100">{t?.modelType ?? '—'}</span></td>
                      <td className="text-xs">
                        {t ? fmtMoney(rateMinor, t.currency) : '—'}
                        {def?.perUser && <span className="text-slate-400"> /user</span>}
                      </td>
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
                  );
                })}
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

      {/* Create */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New subscription"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.clientId || !form.rateRupees || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Create subscription'}
            </button>
          </>
        }
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</h3>
        <Field label="Client" required>
          <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">— select client —</option>
            {clients.data?.map((c: any) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
        </Field>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t pt-3 mt-2">Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Rate model" required hint={modelDef(form.modelType).hint}>
            <select className="input" value={form.modelType} onChange={(e) => setForm({ ...form, modelType: e.target.value as Model })}>
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field
            label={modelDef(form.modelType).perUser ? 'Rate per user (₹)' : 'Rate (₹)'}
            required
            hint={modelDef(form.modelType).perUser ? 'Per user per cycle.' : 'Per cycle.'}
          >
            <input className="input" type="number" min={0} step={0.01} value={form.rateRupees} onChange={(e) => setForm({ ...form, rateRupees: e.target.value })} />
          </Field>
          <Field label="Tax rate (%)" hint="0 if client is unregistered or you want to skip tax.">
            <input className="input" type="number" min={0} step={0.5} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: +e.target.value })} />
          </Field>
          <Field label="Rate label" hint="Free-form name shown on invoices (defaults to client + model).">
            <input className="input" value={form.rateLabel} onChange={(e) => setForm({ ...form, rateLabel: e.target.value })} />
          </Field>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t pt-3 mt-2">Billing schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Billing cycle" required>
            <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as Cycle })}>
              {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Start date" required>
            <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          {modelDef(form.modelType).perUser && (
            <Field label="User count" hint="Number of paid users on the subscription.">
              <input className="input" type="number" min={1} value={form.unitCount} onChange={(e) => setForm({ ...form, unitCount: +e.target.value })} />
            </Field>
          )}
          <Field label="Reminder lead days" hint="Days before renewal the task card is auto-created.">
            <input className="input" type="number" min={0} value={form.reminderLeadDays} onChange={(e) => setForm({ ...form, reminderLeadDays: +e.target.value })} />
          </Field>
          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} />
            Auto-renew at each cycle end
          </label>
        </div>

        <Field label="Notes">
          <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {preview && (
          <div className="mt-3 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 mb-2 font-medium">Charge preview / cycle</div>
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
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit subscription"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="mb-3 p-3 rounded-md bg-brand-50 border border-brand-100">
          <div className="text-[11px] uppercase tracking-wider text-brand-700">Client</div>
          <div className="font-medium">{editingClient || '—'}</div>
          <div className="text-[11px] text-slate-500">To move this subscription to another client, delete it and create a new one (keeps invoice history intact).</div>
        </div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Rate model" hint={modelDef(edit.modelType).hint}>
            <select className="input" value={edit.modelType} onChange={(e) => setEdit({ ...edit, modelType: e.target.value as Model })}>
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label={modelDef(edit.modelType).perUser ? 'Rate per user (₹)' : 'Rate (₹)'}>
            <input className="input" type="number" min={0} step={0.01} value={edit.rateRupees} onChange={(e) => setEdit({ ...edit, rateRupees: e.target.value })} />
          </Field>
          <Field label="Tax rate (%)">
            <input className="input" type="number" min={0} step={0.5} value={edit.taxRate} onChange={(e) => setEdit({ ...edit, taxRate: +e.target.value })} />
          </Field>
          <Field label="Rate label">
            <input className="input" value={edit.rateLabel} onChange={(e) => setEdit({ ...edit, rateLabel: e.target.value })} />
          </Field>
          <Field label="Custom rate override (₹)" hint="Optional; blank uses the rate above." className="md:col-span-2">
            <input className="input" type="number" min={0} step={0.01} placeholder="leave blank to use rate above" value={edit.customRateRupees} onChange={(e) => setEdit({ ...edit, customRateRupees: e.target.value })} />
          </Field>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t pt-3 mt-2">Billing schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Billing cycle" hint="Changing this re-anchors the period from the renewal date.">
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
          <Field label="Reminder lead days">
            <input className="input" type="number" min={0} value={edit.reminderLeadDays} onChange={(e) => setEdit({ ...edit, reminderLeadDays: +e.target.value })} />
          </Field>
          <Field label="Auto-renew">
            <label className="text-sm flex items-center gap-2 h-10">
              <input type="checkbox" checked={edit.autoRenew} onChange={(e) => setEdit({ ...edit, autoRenew: e.target.checked })} />
              Renew automatically each cycle
            </label>
          </Field>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t pt-3 mt-2">Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modelDef(edit.modelType).perUser && (
            <Field label="User count">
              <input className="input" type="number" min={1} value={edit.unitCount} onChange={(e) => setEdit({ ...edit, unitCount: +e.target.value })} />
            </Field>
          )}
          <Field label="Status">
            <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as SubStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea className="input min-h-[80px]" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </Field>
        </div>

        {editPreview && (
          <div className="mt-3 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600 mb-2 font-medium">Charge preview / cycle</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-[11px] text-slate-500">Subtotal</div>
                <div>{fmtMoney(editPreview.subtotal, editPreview.currency)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Tax</div>
                <div>{fmtMoney(editPreview.tax, editPreview.currency)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Total / cycle</div>
                <div className="font-semibold">{fmtMoney(editPreview.total, editPreview.currency)}</div>
              </div>
            </div>
            {edit.customRateRupees.trim() !== '' && (
              <div className="text-[11px] text-amber-700 mt-2">Using custom rate override (₹{edit.customRateRupees}). Clear the field to fall back to ₹{edit.rateRupees}.</div>
            )}
          </div>
        )}
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
