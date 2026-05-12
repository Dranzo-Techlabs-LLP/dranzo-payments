import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/shared/api/client';

type Role = 'POC' | 'BILLING' | 'TECHNICAL' | 'DECISION_MAKER' | 'OTHER';
const ROLES: Role[] = ['POC', 'BILLING', 'TECHNICAL', 'DECISION_MAKER', 'OTHER'];

export function ClientDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
    enabled: !!id,
  });
  const [contact, setContact] = useState<{ name: string; role: Role; email: string; phone: string; isPrimary: boolean }>(
    { name: '', role: 'POC', email: '', phone: '', isPrimary: false }
  );

  const addContact = useMutation({
    mutationFn: async () => (await api.post(`/clients/${id}/contacts`, contact)).data,
    onSuccess: () => {
      setContact({ name: '', role: 'POC', email: '', phone: '', isPrimary: false });
      qc.invalidateQueries({ queryKey: ['client', id] });
    },
  });

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
          <h2 className="font-medium">Contacts</h2>
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Primary</th></tr></thead>
            <tbody>
              {data.contacts?.length ? (
                data.contacts.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.role}</td>
                    <td className="text-xs">{c.email ?? '—'}</td>
                    <td className="text-xs">{c.phone ?? '—'}</td>
                    <td>{c.isPrimary ? '⭐' : ''}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-slate-500 text-center py-3">No contacts.</td></tr>
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t">
            <input className="input" placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <select className="input" value={contact.role} onChange={(e) => setContact({ ...contact, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="input" type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <input className="input" placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={contact.isPrimary} onChange={(e) => setContact({ ...contact, isPrimary: e.target.checked })} />
              Mark as primary POC
            </label>
            <div className="flex justify-end">
              <button className="btn btn-primary" disabled={!contact.name || addContact.isPending} onClick={() => addContact.mutate()}>
                {addContact.isPending ? 'Adding…' : 'Add contact'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
