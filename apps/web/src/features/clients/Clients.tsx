import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';

type Status = 'ACTIVE' | 'ON_HOLD' | 'CHURNED';
const STATUSES: Status[] = ['ACTIVE', 'ON_HOLD', 'CHURNED'];

interface ClientRow {
  id: string;
  legalName: string;
  displayName: string;
  industry?: string;
  country: string;
  currency: string;
  taxId?: string;
  placeOfSupply?: string;
  status: Status;
  accountManagerId?: string;
  contacts?: { id: string; name: string; role: string; isPrimary: boolean }[];
}

interface Form {
  legalName: string;
  displayName: string;
  industry: string;
  country: string;
  currency: string;
  taxId: string;
  placeOfSupply: string;
  status: Status;
}

const EMPTY: Form = { legalName: '', displayName: '', industry: '', country: 'IN', currency: 'INR', taxId: '', placeOfSupply: '', status: 'ACTIVE' };

export function Clients() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientRow[]> => (await api.get('/clients')).data,
  });

  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: async () =>
      editing
        ? (await api.patch(`/clients/${editing}`, form)).data
        : (await api.post('/clients', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setMode('closed');
      setForm(EMPTY);
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setConfirmId(null);
    },
  });

  function openCreate() {
    setForm(EMPTY);
    setEditing(null);
    setMode('create');
  }
  function openEdit(c: ClientRow) {
    setForm({
      legalName: c.legalName,
      displayName: c.displayName,
      industry: c.industry ?? '',
      country: c.country,
      currency: c.currency,
      taxId: c.taxId ?? '',
      placeOfSupply: c.placeOfSupply ?? '',
      status: c.status,
    });
    setEditing(c.id);
    setMode('edit');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-slate-500">Customer companies with POC + tax info.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New client</button>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Status</th><th>Country</th><th>Currency</th><th>GSTIN</th><th>POC</th><th>Contacts</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => {
                  const poc = c.contacts?.find((x) => x.isPrimary) ?? c.contacts?.[0];
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link className="text-brand-600 hover:underline" to={`/clients/${c.id}`}>{c.displayName}</Link>
                        <div className="text-xs text-slate-500">{c.legalName}</div>
                      </td>
                      <td><span className="badge bg-slate-100">{c.status}</span></td>
                      <td>{c.country}</td>
                      <td>{c.currency}</td>
                      <td className="text-xs">{c.taxId || '—'}</td>
                      <td className="text-xs">{poc ? `${poc.name} (${poc.role})` : '—'}</td>
                      <td className="text-xs text-slate-500">{c.contacts?.length ?? 0}</td>
                      <td>
                        <div className="flex gap-2 justify-end">
                          <button className="btn btn-secondary py-1 text-xs" onClick={() => openEdit(c)}>Edit</button>
                          <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmId(c.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data?.length && (
                  <tr><td colSpan={8} className="text-center text-slate-500 py-4">No clients yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={mode !== 'closed'}
        onClose={() => setMode('closed')}
        title={mode === 'edit' ? 'Edit client' : 'New client'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setMode('closed')}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.legalName || !form.displayName || upsert.isPending} onClick={() => upsert.mutate()}>
              {upsert.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="Legal name *" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          <input className="input" placeholder="Display name *" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className="input" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="Country (IN)" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="Currency (INR)" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="GSTIN / VAT" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          <input className="input" placeholder="Place of supply (e.g. KA)" value={form.placeOfSupply} onChange={(e) => setForm({ ...form, placeOfSupply: e.target.value.toUpperCase() })} />
        </div>
        {upsert.isError && <p className="text-red-600 text-sm">{(upsert.error as any)?.response?.data?.message || 'Failed'}</p>}
      </Modal>

      <ConfirmDelete
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && del.mutate(confirmId)}
        title="Delete client?"
        message="The client, its contacts, and all linked subscriptions/invoices will be soft-deleted."
        busy={del.isPending}
      />
    </div>
  );
}
