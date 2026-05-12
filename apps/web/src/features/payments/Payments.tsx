import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney, toMinor } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

type Method = 'BANK' | 'UPI' | 'CARD' | 'CHEQUE' | 'OTHER';
const METHODS: Method[] = ['BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER'];

export function Payments() {
  const qc = useQueryClient();
  const payments = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api.get('/payments')).data,
  });
  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
  });

  const invMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const i of invoices.data ?? []) m[i.id] = i;
    return m;
  }, [invoices.data]);

  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoiceId: '',
    amountRupees: 0,
    method: 'BANK' as Method,
    receivedOn: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    notes: '',
  });

  const create = useMutation({
    mutationFn: async () =>
      (await api.post('/payments', {
        invoiceId: form.invoiceId,
        amount: toMinor(form.amountRupees),
        method: form.method,
        receivedOn: form.receivedOn,
        referenceNo: form.referenceNo || undefined,
        notes: form.notes || undefined,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setConfirmId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-slate-500">Recorded receipts. Deleting a payment reopens its invoice if it was closing.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Record payment</button>
      </div>

      <div className="card">
        <div className="card-body overflow-auto">
          {payments.isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Received</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {payments.data?.map((p: any) => {
                  const inv = invMap[p.invoiceId];
                  return (
                    <tr key={p.id}>
                      <td className="text-xs">{fmtDate(p.receivedOn)}</td>
                      <td className="text-xs font-mono">{inv?.invoiceNo ?? p.invoiceId.slice(0, 8)}</td>
                      <td><span className="badge bg-slate-100">{p.method}</span></td>
                      <td className="text-xs">{p.referenceNo ?? '—'}</td>
                      <td className="font-medium">{fmtMoney(p.amount, p.currency)}</td>
                      <td>
                        <div className="flex justify-end">
                          <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmId(p.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!payments.data?.length && (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-4">No payments.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!form.invoiceId || !form.amountRupees || create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <Field label="Invoice" required>
          <select className="input" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
            <option value="">— pick invoice —</option>
            {invoices.data?.filter((i: any) => i.status === 'SENT' || i.status === 'OVERDUE').map((i: any) => (
              <option key={i.id} value={i.id}>{i.invoiceNo} — {fmtMoney(i.total, i.currency)} ({i.status})</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" required>
            <input className="input" type="number" min={0} step={0.01} value={form.amountRupees} onChange={(e) => setForm({ ...form, amountRupees: +e.target.value })} />
          </Field>
          <Field label="Method" required>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as Method })}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Received on" required>
            <input className="input" type="date" value={form.receivedOn} onChange={(e) => setForm({ ...form, receivedOn: e.target.value })} />
          </Field>
          <Field label="Reference number" hint="UTR, cheque no, transaction ID, etc.">
            <input className="input" value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {create.isError && <p className="text-sm text-red-600">{(create.error as any)?.response?.data?.message || 'Failed'}</p>}
      </Modal>

      <ConfirmDelete
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && del.mutate(confirmId)}
        title="Delete payment?"
        message="The payment is soft-removed. If it was closing the invoice, the invoice reverts to SENT."
        busy={del.isPending}
      />
    </div>
  );
}
