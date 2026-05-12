import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtDate } from '@/shared/lib/format-date';

type Type = 'TAX_FILING' | 'CONTRACT_REVIEW' | 'KYC' | 'LICENSE' | 'SLA' | 'AUDIT';
type Freq = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY' | 'ONE_OFF';
const TYPES: Type[] = ['TAX_FILING', 'CONTRACT_REVIEW', 'KYC', 'LICENSE', 'SLA', 'AUDIT'];
const FREQ: Freq[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY', 'ONE_OFF'];

export function Compliance() {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ['compliance-items'],
    queryFn: async () => (await api.get('/compliance/items')).data,
  });
  const [form, setForm] = useState({
    title: '',
    type: 'TAX_FILING' as Type,
    frequency: 'MONTHLY' as Freq,
    nextDueDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
    reminderLeadDays: 7,
    jurisdiction: '',
  });
  const create = useMutation({
    mutationFn: async () => (await api.post('/compliance/items', form)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-items'] }),
  });

  // Compose calendar grid: month view of current month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startWeekday = monthStart.getDay();

  const byDate: Record<string, any[]> = {};
  for (const i of items.data ?? []) {
    const d = i.nextDueDate;
    (byDate[d] ||= []).push(i);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance calendar</h1>
        <p className="text-slate-500">Tax filings, KYC, licenses, contract reviews — same task auto-flow.</p>
      </div>

      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-2">
          <input className="input md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Type })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Freq })}>
            {FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input className="input" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
          <button className="btn btn-primary" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
            Add item
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startWeekday }, (_, i) => <div key={`b${i}`} className="bg-slate-50 rounded h-24" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = byDate[date] ?? [];
              const isToday = day === today.getDate();
              return (
                <div key={day} className={`rounded h-24 border p-1 ${isToday ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'} overflow-hidden`}>
                  <div className="text-xs font-medium">{day}</div>
                  {dayItems.map((i) => (
                    <div key={i.id} className="text-[10px] mt-1 px-1 rounded bg-brand-50 text-brand-700 truncate" title={i.title}>
                      {i.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-2">All items</h2>
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Frequency</th><th>Next due</th><th>Status</th></tr></thead>
            <tbody>
              {items.data?.map((i: any) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td><span className="badge bg-slate-100">{i.type}</span></td>
                  <td>{i.frequency}</td>
                  <td>{fmtDate(i.nextDueDate)}</td>
                  <td><span className="badge bg-slate-100">{i.status}</span></td>
                </tr>
              ))}
              {!items.data?.length && <tr><td colSpan={5} className="text-center text-slate-500 py-3">No items.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
