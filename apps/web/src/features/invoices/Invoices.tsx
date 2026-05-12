import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtMoney } from '@/shared/lib/money';
import { fmtDate } from '@/shared/lib/format-date';
import { useAuthStore } from '@/shared/state/auth-store';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';

type Method = 'BANK' | 'UPI' | 'CARD' | 'CHEQUE' | 'OTHER';
const METHODS: Method[] = ['BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER'];

export function Invoices() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
    refetchInterval: 15_000,
  });

  const [payState, setPayState] = useState<Record<string, { method: Method; ref: string; date: string }>>({});
  const [confirmVoid, setConfirmVoid] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: async (vars: { invoiceId: string; amount: number; method: Method; ref: string; date: string }) =>
      (await api.post('/payments', {
        invoiceId: vars.invoiceId,
        amount: vars.amount,
        method: vars.method,
        receivedOn: vars.date,
        referenceNo: vars.ref,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const voidIt = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/invoices/${id}/void`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setConfirmVoid(null);
    },
  });

  function openHtml(id: string) {
    fetch(`/api/invoices/${id}/html`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.text())
      .then((html) => {
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
        }
      });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-slate-500">Auto-numbered per org per FY. View HTML, mark paid, or void.</p>
      </div>

      <div className="card">
        <div className="card-body overflow-auto">
          {isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>#</th><th>Issued</th><th>Due</th><th>Period</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data?.map((i: any) => {
                  const st = payState[i.id] ?? { method: 'BANK' as Method, ref: '', date: new Date().toISOString().slice(0, 10) };
                  const canPay = i.status === 'SENT' || i.status === 'OVERDUE';
                  const canVoid = i.status !== 'PAID' && i.status !== 'VOID';
                  return (
                    <tr key={i.id}>
                      <td className="text-xs font-mono">{i.invoiceNo}</td>
                      <td className="text-xs">{fmtDate(i.issueDate)}</td>
                      <td className="text-xs">{fmtDate(i.dueDate)}</td>
                      <td className="text-xs">{fmtDate(i.periodStart)} → {fmtDate(i.periodEnd)}</td>
                      <td>{fmtMoney(i.subtotal, i.currency)}</td>
                      <td>{fmtMoney(i.tax, i.currency)}</td>
                      <td className="font-medium">{fmtMoney(i.total, i.currency)}</td>
                      <td><span className="badge bg-slate-100">{i.status}</span></td>
                      <td>
                        <div className="flex gap-2 items-center">
                          <button className="btn btn-secondary py-1 text-xs" onClick={() => openHtml(i.id)}>HTML</button>
                          {canPay && (
                            <details>
                              <summary className="btn btn-primary py-1 text-xs cursor-pointer">Mark paid</summary>
                              <div className="mt-2 p-2 border rounded-md bg-slate-50 space-y-2 w-64">
                                <select className="input py-1 text-xs" value={st.method}
                                        onChange={(e) => setPayState({ ...payState, [i.id]: { ...st, method: e.target.value as Method } })}>
                                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input className="input py-1 text-xs" placeholder="Reference no" value={st.ref}
                                       onChange={(e) => setPayState({ ...payState, [i.id]: { ...st, ref: e.target.value } })} />
                                <input className="input py-1 text-xs" type="date" value={st.date}
                                       onChange={(e) => setPayState({ ...payState, [i.id]: { ...st, date: e.target.value } })} />
                                <button
                                  className="btn btn-primary py-1 text-xs w-full"
                                  disabled={pay.isPending}
                                  onClick={() => pay.mutate({ invoiceId: i.id, amount: i.total, method: st.method, ref: st.ref, date: st.date })}
                                >
                                  Record full payment
                                </button>
                              </div>
                            </details>
                          )}
                          {canVoid && (
                            <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmVoid(i.id)}>Void</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data?.length && (
                  <tr><td colSpan={9} className="text-center text-slate-500 py-4">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDelete
        open={!!confirmVoid}
        onClose={() => setConfirmVoid(null)}
        onConfirm={() => confirmVoid && voidIt.mutate(confirmVoid)}
        title="Void invoice?"
        message="The invoice number stays but the document is marked VOID. A fresh invoice can then be re-issued for the same cycle."
        busy={voidIt.isPending}
      />
    </div>
  );
}
