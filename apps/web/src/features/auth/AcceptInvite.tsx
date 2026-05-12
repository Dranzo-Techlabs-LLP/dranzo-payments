import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/shared/api/client';

export function AcceptInvite() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') ?? '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post('/invitations/accept', { token, name, password });
      setDone(true);
      setTimeout(() => nav('/login'), 1500);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <div className="p-6">Missing invitation token.</div>;
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="card-body space-y-4">
          <h1 className="text-xl font-semibold">Accept invitation</h1>
          {done ? (
            <p className="text-green-700">Account created. Redirecting to login…</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="label">Your name</label>
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy ? 'Creating…' : 'Accept and create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
