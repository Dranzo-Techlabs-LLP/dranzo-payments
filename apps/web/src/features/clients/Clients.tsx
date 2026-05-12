import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { Field } from '@/shared/ui/Field';

type Status = 'ACTIVE' | 'ON_HOLD' | 'CHURNED';
const STATUSES: Status[] = ['ACTIVE', 'ON_HOLD', 'CHURNED'];

interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

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
  contacts?: Contact[];
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
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
}

const EMPTY: Form = {
  legalName: '', displayName: '', industry: '', country: 'IN', currency: 'INR',
  taxId: '', placeOfSupply: '', status: 'ACTIVE',
  primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '',
};

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
    mutationFn: async () => {
      const { primaryContactName, primaryContactEmail, primaryContactPhone, ...rest } = form;
      const body: any = { ...rest };
      if (primaryContactName.trim()) {
        body.primaryContact = {
          name: primaryContactName.trim(),
          email: primaryContactEmail.trim() || undefined,
          phone: primaryContactPhone.trim() || undefined,
        };
      }
      return editing
        ? (await api.patch(`/clients/${editing}`, body)).data
        : (await api.post('/clients', body)).data;
    },
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
    const primary = c.contacts?.find((x) => x.isPrimary);
    setForm({
      legalName: c.legalName,
      displayName: c.displayName,
      industry: c.industry ?? '',
      country: c.country,
      currency: c.currency,
      taxId: c.taxId ?? '',
      placeOfSupply: c.placeOfSupply ?? '',
      status: c.status,
      primaryContactName: primary?.name ?? '',
      primaryContactEmail: primary?.email ?? '',
      primaryContactPhone: primary?.phone ?? '',
    });
    setEditing(c.id);
    setMode('edit');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-slate-500">Customer companies + POC contact. Add more contacts on the client detail page.</p>
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
                  <th>Name</th><th>Status</th><th>POC</th><th>POC email</th><th>POC phone</th><th>GSTIN</th><th>Country</th><th>Contacts</th><th></th>
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
                      <td className="text-xs">{poc?.name ?? '—'}</td>
                      <td className="text-xs">{poc?.email ?? '—'}</td>
                      <td className="text-xs">{poc?.phone ?? '—'}</td>
                      <td className="text-xs">{c.taxId || '—'}</td>
                      <td className="text-xs">{c.country} · {c.currency}</td>
                      <td className="text-xs text-slate-500">
                        <Link to={`/clients/${c.id}`} className="text-brand-600 hover:underline">{c.contacts?.length ?? 0} →</Link>
                      </td>
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
                  <tr><td colSpan={9} className="text-center text-slate-500 py-4">No clients yet.</td></tr>
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
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Legal name" required>
            <input className="input" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </Field>
          <Field label="Display name" required>
            <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label="Industry">
            <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Country (ISO-2)" hint="Two-letter country code, e.g. IN, US.">
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Currency (ISO-3)" hint="Three-letter currency code, e.g. INR, USD.">
            <input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="GSTIN / VAT" hint="Leave blank if unregistered — no tax will be applied.">
            <input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          </Field>
          <Field label="Place of supply" hint="Two-letter state code (e.g. KA) — drives CGST/SGST vs IGST.">
            <input className="input" value={form.placeOfSupply} onChange={(e) => setForm({ ...form, placeOfSupply: e.target.value.toUpperCase() })} />
          </Field>
        </div>

        <div className="border-t pt-3 mt-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primary point of contact</h3>
          <p className="text-[11px] text-slate-500 mb-2">Marked as primary POC automatically. Add more contacts (billing, technical, etc.) from the client detail page after saving.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Contact name">
              <input className="input" value={form.primaryContactName} onChange={(e) => setForm({ ...form, primaryContactName: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.primaryContactEmail} onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.primaryContactPhone} onChange={(e) => setForm({ ...form, primaryContactPhone: e.target.value })} />
            </Field>
          </div>
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
