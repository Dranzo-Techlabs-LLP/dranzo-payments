import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { fmtDate } from '@/shared/lib/format-date';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';

type Type = 'TAX_FILING' | 'CONTRACT_REVIEW' | 'KYC' | 'LICENSE' | 'SLA' | 'AUDIT';
type Freq = 'MONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY' | 'ONE_OFF';
const TYPES: Type[] = ['TAX_FILING', 'CONTRACT_REVIEW', 'KYC', 'LICENSE', 'SLA', 'AUDIT'];
const FREQ: Freq[] = ['MONTHLY', 'QUARTERLY', 'HALFYEARLY', 'YEARLY', 'ONE_OFF'];
const ITEM_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;

interface ItemForm {
  title: string;
  type: Type;
  frequency: Freq;
  nextDueDate: string;
  reminderLeadDays: number;
  jurisdiction: string;
  status: 'ACTIVE' | 'ARCHIVED';
  notes: string;
}
const ITEM_EMPTY: ItemForm = {
  title: '', type: 'TAX_FILING', frequency: 'MONTHLY',
  nextDueDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
  reminderLeadDays: 7, jurisdiction: '', status: 'ACTIVE', notes: '',
};

interface TemplateForm {
  title: string;
  type: Type;
  frequency: Freq;
  dayOfMonth?: number;
  monthOfYear?: number;
  jurisdiction: string;
  description: string;
}
const TPL_EMPTY: TemplateForm = {
  title: '', type: 'TAX_FILING', frequency: 'MONTHLY',
  dayOfMonth: undefined, monthOfYear: undefined,
  jurisdiction: '', description: '',
};

export function Compliance() {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ['compliance-items'],
    queryFn: async () => (await api.get('/compliance/items')).data,
  });
  const templates = useQuery({
    queryKey: ['compliance-templates'],
    queryFn: async () => (await api.get('/compliance/templates')).data,
  });

  // Item modal state
  const [itemModal, setItemModal] = useState<{ id: string | null } | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(ITEM_EMPTY);
  const [confirmItem, setConfirmItem] = useState<string | null>(null);

  const upsertItem = useMutation({
    mutationFn: async () =>
      itemModal?.id
        ? (await api.patch(`/compliance/items/${itemModal.id}`, itemForm)).data
        : (await api.post('/compliance/items', itemForm)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-items'] }); setItemModal(null); setItemForm(ITEM_EMPTY); },
  });
  const delItem = useMutation({
    mutationFn: async (id: string) => api.delete(`/compliance/items/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-items'] }); setConfirmItem(null); },
  });
  function openItemEdit(i: any) {
    setItemForm({
      title: i.title, type: i.type, frequency: i.frequency,
      nextDueDate: i.nextDueDate, reminderLeadDays: i.reminderLeadDays,
      jurisdiction: i.jurisdiction ?? '', status: i.status, notes: i.notes ?? '',
    });
    setItemModal({ id: i.id });
  }

  // Template modal state
  const [tplModal, setTplModal] = useState<{ id: string | null } | null>(null);
  const [tplForm, setTplForm] = useState<TemplateForm>(TPL_EMPTY);
  const [confirmTpl, setConfirmTpl] = useState<string | null>(null);

  const upsertTpl = useMutation({
    mutationFn: async () =>
      tplModal?.id
        ? (await api.patch(`/compliance/templates/${tplModal.id}`, tplForm)).data
        : (await api.post('/compliance/templates', tplForm)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-templates'] }); setTplModal(null); setTplForm(TPL_EMPTY); },
  });
  const delTpl = useMutation({
    mutationFn: async (id: string) => api.delete(`/compliance/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-templates'] }); setConfirmTpl(null); },
  });
  function openTplEdit(t: any) {
    setTplForm({
      title: t.title, type: t.type, frequency: t.frequency,
      dayOfMonth: t.dayOfMonth ?? undefined, monthOfYear: t.monthOfYear ?? undefined,
      jurisdiction: t.jurisdiction ?? '', description: t.description ?? '',
    });
    setTplModal({ id: t.id });
  }

  // Calendar grid
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startWeekday = monthStart.getDay();
  const byDate: Record<string, any[]> = {};
  for (const i of items.data ?? []) (byDate[i.nextDueDate] ||= []).push(i);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance calendar</h1>
          <p className="text-slate-500">Tax filings, KYC, licenses, contract reviews — auto-task flow.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { setTplForm(TPL_EMPTY); setTplModal({ id: null }); }}>+ Template</button>
          <button className="btn btn-primary" onClick={() => { setItemForm(ITEM_EMPTY); setItemModal({ id: null }); }}>+ Item</button>
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
                    <div key={i.id} className="text-[10px] mt-1 px-1 rounded bg-brand-50 text-brand-700 truncate cursor-pointer" title={i.title} onClick={() => openItemEdit(i)}>
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
          <h2 className="font-medium mb-2">Items</h2>
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Frequency</th><th>Next due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.data?.map((i: any) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td><span className="badge bg-slate-100">{i.type}</span></td>
                  <td>{i.frequency}</td>
                  <td>{fmtDate(i.nextDueDate)}</td>
                  <td><span className="badge bg-slate-100">{i.status}</span></td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button className="btn btn-secondary py-1 text-xs" onClick={() => openItemEdit(i)}>Edit</button>
                      <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmItem(i.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.data?.length && <tr><td colSpan={6} className="text-center text-slate-500 py-3">No items.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-2">Templates</h2>
          <p className="text-xs text-slate-500 mb-2">Reusable definitions. Use them to spin up new items quickly.</p>
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Frequency</th><th>Day</th><th>Jurisdiction</th><th></th></tr></thead>
            <tbody>
              {templates.data?.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td><span className="badge bg-slate-100">{t.type}</span></td>
                  <td>{t.frequency}</td>
                  <td className="text-xs">{t.dayOfMonth ?? '—'}{t.monthOfYear ? `/${t.monthOfYear}` : ''}</td>
                  <td className="text-xs">{t.jurisdiction ?? '—'}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button className="btn btn-secondary py-1 text-xs" onClick={() => openTplEdit(t)}>Edit</button>
                      <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmTpl(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!templates.data?.length && <tr><td colSpan={6} className="text-center text-slate-500 py-3">No templates.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item modal */}
      <Modal
        open={!!itemModal}
        onClose={() => setItemModal(null)}
        title={itemModal?.id ? 'Edit compliance item' : 'New compliance item'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setItemModal(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!itemForm.title || upsertItem.isPending} onClick={() => upsertItem.mutate()}>
              {upsertItem.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <input className="input" placeholder="Title *" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={itemForm.type} onChange={(e) => setItemForm({ ...itemForm, type: e.target.value as Type })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={itemForm.frequency} onChange={(e) => setItemForm({ ...itemForm, frequency: e.target.value as Freq })}>
            {FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input className="input" type="date" value={itemForm.nextDueDate} onChange={(e) => setItemForm({ ...itemForm, nextDueDate: e.target.value })} />
          <input className="input" type="number" placeholder="Reminder lead days" value={itemForm.reminderLeadDays} onChange={(e) => setItemForm({ ...itemForm, reminderLeadDays: +e.target.value })} />
          <input className="input" placeholder="Jurisdiction" value={itemForm.jurisdiction} onChange={(e) => setItemForm({ ...itemForm, jurisdiction: e.target.value })} />
          <select className="input" value={itemForm.status} onChange={(e) => setItemForm({ ...itemForm, status: e.target.value as 'ACTIVE' | 'ARCHIVED' })}>
            {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <textarea className="input min-h-[60px]" placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
      </Modal>

      {/* Template modal */}
      <Modal
        open={!!tplModal}
        onClose={() => setTplModal(null)}
        title={tplModal?.id ? 'Edit template' : 'New template'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setTplModal(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!tplForm.title || upsertTpl.isPending} onClick={() => upsertTpl.mutate()}>
              {upsertTpl.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <input className="input" placeholder="Title *" value={tplForm.title} onChange={(e) => setTplForm({ ...tplForm, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={tplForm.type} onChange={(e) => setTplForm({ ...tplForm, type: e.target.value as Type })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={tplForm.frequency} onChange={(e) => setTplForm({ ...tplForm, frequency: e.target.value as Freq })}>
            {FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input className="input" type="number" min={1} max={31} placeholder="Day of month (1-31)" value={tplForm.dayOfMonth ?? ''} onChange={(e) => setTplForm({ ...tplForm, dayOfMonth: e.target.value ? +e.target.value : undefined })} />
          <input className="input" type="number" min={1} max={12} placeholder="Month of year (1-12)" value={tplForm.monthOfYear ?? ''} onChange={(e) => setTplForm({ ...tplForm, monthOfYear: e.target.value ? +e.target.value : undefined })} />
          <input className="input md:col-span-2" placeholder="Jurisdiction" value={tplForm.jurisdiction} onChange={(e) => setTplForm({ ...tplForm, jurisdiction: e.target.value })} />
        </div>
        <textarea className="input min-h-[60px]" placeholder="Description" value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
      </Modal>

      <ConfirmDelete open={!!confirmItem} onClose={() => setConfirmItem(null)} onConfirm={() => confirmItem && delItem.mutate(confirmItem)} title="Delete item?" busy={delItem.isPending} />
      <ConfirmDelete open={!!confirmTpl} onClose={() => setConfirmTpl(null)} onConfirm={() => confirmTpl && delTpl.mutate(confirmTpl)} title="Delete template?" busy={delTpl.isPending} />
    </div>
  );
}
