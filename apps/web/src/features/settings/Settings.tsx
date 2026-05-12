import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/state/auth-store';

interface OrgSettings {
  id: string;
  legalName: string;
  displayName: string;
  country: string;
  defaultCurrency: string;
  taxId?: string | null;
  invoicePrefix: string;
  logoUrl?: string | null;
  signingAuthority?: string | null;
  invoiceFooter?: string | null;
  timezone: string;
  address?: Record<string, unknown> | null;
  bankDetails?: Record<string, unknown> | null;
}

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async (): Promise<OrgSettings> =>
      (await api.get('/settings/organization')).data,
  });

  const [form, setForm] = useState<OrgSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const update = useMutation({
    mutationFn: async (payload: Partial<OrgSettings>) =>
      (await api.patch('/settings/organization', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-settings'] }),
  });

  if (isLoading || !form) return <p>Loading…</p>;

  function set<K extends keyof OrgSettings>(k: K, v: OrgSettings[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Organization settings</h1>
        <p className="text-slate-500">Branding, tax IDs, invoice defaults.</p>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          <Row label="Legal name">
            <input className="input" value={form.legalName} disabled={!isAdmin}
                   onChange={(e) => set('legalName', e.target.value)} />
          </Row>
          <Row label="Display name">
            <input className="input" value={form.displayName} disabled={!isAdmin}
                   onChange={(e) => set('displayName', e.target.value)} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Country (ISO-2)">
              <input className="input" value={form.country} disabled={!isAdmin}
                     onChange={(e) => set('country', e.target.value.toUpperCase())} />
            </Row>
            <Row label="Default currency (ISO-3)">
              <input className="input" value={form.defaultCurrency} disabled={!isAdmin}
                     onChange={(e) => set('defaultCurrency', e.target.value.toUpperCase())} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Tax ID (GSTIN / VAT)">
              <input className="input" value={form.taxId ?? ''} disabled={!isAdmin}
                     onChange={(e) => set('taxId', e.target.value)} />
            </Row>
            <Row label="Invoice prefix">
              <input className="input" value={form.invoicePrefix} disabled={!isAdmin}
                     onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} />
            </Row>
          </div>
          <Row label="Logo URL">
            <input className="input" value={form.logoUrl ?? ''} disabled={!isAdmin}
                   placeholder="https://…/logo.png"
                   onChange={(e) => set('logoUrl', e.target.value)} />
          </Row>
          <Row label="Signing authority">
            <input className="input" value={form.signingAuthority ?? ''} disabled={!isAdmin}
                   onChange={(e) => set('signingAuthority', e.target.value)} />
          </Row>
          <Row label="Timezone (IANA)">
            <input className="input" value={form.timezone} disabled={!isAdmin}
                   onChange={(e) => set('timezone', e.target.value)} />
          </Row>
          <Row label="Invoice footer">
            <textarea className="input min-h-[80px]" value={form.invoiceFooter ?? ''} disabled={!isAdmin}
                      onChange={(e) => set('invoiceFooter', e.target.value)} />
          </Row>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 justify-end">
          {update.isError && (
            <p className="text-red-600 self-center text-sm">Save failed.</p>
          )}
          {update.isSuccess && (
            <p className="text-green-700 self-center text-sm">Saved.</p>
          )}
          <button
            className="btn btn-primary"
            disabled={update.isPending}
            onClick={() => update.mutate(form)}
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
