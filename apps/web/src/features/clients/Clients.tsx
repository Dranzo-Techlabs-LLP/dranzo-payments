import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';

type Status = 'ACTIVE' | 'ON_HOLD' | 'CHURNED';
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

export function Clients() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientRow[]> => (await api.get('/clients')).data,
  });
  const [form, setForm] = useState({
    legalName: '',
    displayName: '',
    country: 'IN',
    currency: 'INR',
    taxId: '',
    placeOfSupply: '',
    industry: '',
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/clients', form)).data,
    onSuccess: () => {
      setForm({ legalName: '', displayName: '', country: 'IN', currency: 'INR', taxId: '', placeOfSupply: '', industry: '' });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-slate-500">Customer companies with POC + tax info.</p>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="font-medium">Add a client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input" placeholder="Legal name *" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            <input className="input" placeholder="Display name *" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <input className="input" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            <input className="input" placeholder="Country (IN)" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
            <input className="input" placeholder="Currency (INR)" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <input className="input" placeholder="GSTIN / VAT (optional)" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            <input className="input" placeholder="Place of supply (e.g. KA)" value={form.placeOfSupply} onChange={(e) => setForm({ ...form, placeOfSupply: e.target.value.toUpperCase() })} />
          </div>
          {create.isError && <p className="text-red-600 text-sm">{(create.error as any)?.response?.data?.message || 'Failed'}</p>}
          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={!form.legalName || !form.displayName || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Create client'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <p>Loading…</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Status</th><th>Country</th><th>Currency</th><th>GSTIN</th><th>POC</th><th>Contacts</th>
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
                    </tr>
                  );
                })}
                {!data?.length && (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-4">No clients yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
