import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/state/auth-store';

export function Register() {
  const nav = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.post('/auth/register', form);
      setTokens(res.data.accessToken, res.data.refreshToken);
      nav('/dashboard');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="card-body space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Create your organization</h1>
            <p className="text-sm text-slate-500">You become the Admin of this workspace.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">Organization name</label>
              <input className="input" required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
            </div>
            <div>
              <label className="label">Your name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <p className="text-sm text-slate-600">
            Already have an account? <Link className="text-brand-600 hover:underline" to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
