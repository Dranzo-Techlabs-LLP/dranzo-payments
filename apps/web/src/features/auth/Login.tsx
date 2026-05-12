import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/state/auth-store';

export function Login() {
  const nav = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [email, setEmail] = useState('admin@dranzo.test');
  const [password, setPassword] = useState('Admin@123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setTokens(res.data.accessToken, res.data.refreshToken);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="card-body space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Sign in to Dranzo Payments</h1>
            <p className="text-sm text-slate-500">Manage subscriptions, billing, compliance.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-sm text-slate-600">
            No account? <Link className="text-brand-600 hover:underline" to="/register">Create an organization</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
