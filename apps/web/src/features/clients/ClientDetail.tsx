import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

type Role = 'POC' | 'BILLING' | 'TECHNICAL' | 'DECISION_MAKER' | 'OTHER';
const ROLES: Role[] = ['POC', 'BILLING', 'TECHNICAL', 'DECISION_MAKER', 'OTHER'];

interface Contact {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

interface ContactForm {
  name: string;
  role: Role;
  email: string;
  phone: string;
  isPrimary: boolean;
}

const EMPTY: ContactForm = { name: '', role: 'POC', email: '', phone: '', isPrimary: false };

export function ClientDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: async () =>
      editingId
        ? (await api.patch(`/clients/contacts/${editingId}`, form)).data
        : (await api.post(`/clients/${id}/contacts`, form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      setMode('closed');
      setForm(EMPTY);
      setEditingId(null);
    },
  });

  const del = useMutation({
    mutationFn: async (cid: string) => api.delete(`/clients/contacts/${cid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      setConfirmId(null);
    },
  });

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setMode('create');
  }
  function openEdit(c: Contact) {
    setForm({ name: c.name, role: c.role, email: c.email ?? '', phone: c.phone ?? '', isPrimary: c.isPrimary });
    setEditingId(c.id);
    setMode('edit');
  }

  if (isLoading || !data) return <p>Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{data.displayName}</h1>
        <p className="text-slate-500">{data.legalName} · {data.status}</p>
      </div>

      <div className="card">
        <div className="card-body grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-500">Country:</span> {data.country}</div>
          <div><span className="text-slate-500">Currency:</span> {data.currency}</div>
          <div><span className="text-slate-500">GSTIN / VAT:</span> {data.taxId ?? '—'}</div>
          <div><span className="text-slate-500">Place of Supply:</span> {data.placeOfSupply ?? '—'}</div>
          <div><span className="text-slate-500">Industry:</span> {data.industry ?? '—'}</div>
          <div><span className="text-slate-500">Account manager:</span> {data.accountManagerId ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-medium">Contacts</h2>
            <button className="btn btn-primary py-1 text-xs" onClick={openCreate}>+ Add contact</button>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Primary</th><th></th></tr></thead>
            <tbody>
              {data.contacts?.length ? (
                data.contacts.map((c: Contact) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.role}</td>
                    <td className="text-xs">{c.email ?? '—'}</td>
                    <td className="text-xs">{c.phone ?? '—'}</td>
                    <td>{c.isPrimary ? '⭐' : ''}</td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-secondary py-1 text-xs" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-danger py-1 text-xs" onClick={() => setConfirmId(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-slate-500 text-center py-3">No contacts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={mode !== 'closed'}
        onClose={() => setMode('closed')}
        title={mode === 'edit' ? 'Edit contact' : 'New contact'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setMode('closed')}>Cancel</button>
            <button className="btn btn-primary" disabled={!form.name || upsert.isPending} onClick={() => upsert.mutate()}>
              {upsert.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name" required>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Role" hint="POC = primary point of contact; Billing = receives invoices.">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} />
            Mark as primary POC
          </label>
        </div>
      </Modal>

      <ConfirmDelete
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && del.mutate(confirmId)}
        title="Delete contact?"
        busy={del.isPending}
      />
    </div>
  );
}
