import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

type Role = 'ADMIN' | 'FINANCE' | 'ACCOUNT_MANAGER' | 'VIEWER';
const ROLES: Role[] = ['ADMIN', 'FINANCE', 'ACCOUNT_MANAGER', 'VIEWER'];

interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: Role;
  acceptedAt?: string | null;
  expiresAt: string;
}

export function Team() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ['team', 'users'],
    queryFn: async (): Promise<TeamUser[]> => (await api.get('/users')).data,
  });
  const invites = useQuery({
    queryKey: ['team', 'invites'],
    queryFn: async (): Promise<Invite[]> => (await api.get('/invitations')).data,
  });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('FINANCE');
  const [latestAcceptUrl, setLatestAcceptUrl] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: async () =>
      (await api.post('/invitations', { email, role })).data,
    onSuccess: (res) => {
      setEmail('');
      setLatestAcceptUrl(res.acceptUrl);
      qc.invalidateQueries({ queryKey: ['team', 'invites'] });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<TeamUser> }) =>
      (await api.patch(`/users/${vars.id}`, vars.patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'users'] }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'invites'] }),
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-slate-500">Invite users, manage roles.</p>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="font-medium">Invite a new user</h2>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input w-44" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button className="btn btn-primary" disabled={!email || invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
          {invite.isError && <p className="text-sm text-red-600">{(invite.error as any)?.response?.data?.message ?? 'Failed'}</p>}
          {latestAcceptUrl && (
            <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
              Email delivery comes in Slice 6. Share this link manually:&nbsp;
              <a className="underline" href={latestAcceptUrl}>{latestAcceptUrl}</a>
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-3">Members</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="input py-1"
                      value={u.role}
                      onChange={(e) => updateUser.mutate({ id: u.id, patch: { role: e.target.value as Role } })}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={u.isActive}
                           onChange={(e) => updateUser.mutate({ id: u.id, patch: { isActive: e.target.checked } })} />
                  </td>
                  <td className="text-slate-500 text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-3">Pending invitations</h2>
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr>
            </thead>
            <tbody>
              {invites.data?.length ? (
                invites.data.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{i.role}</td>
                    <td>
                      {i.acceptedAt ? (
                        <span className="badge bg-green-100 text-green-700">Accepted</span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{new Date(i.expiresAt).toLocaleString()}</td>
                    <td className="text-right">
                      {!i.acceptedAt && (
                        <button className="btn btn-danger" onClick={() => revoke.mutate(i.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-slate-500 text-center py-4">No invitations.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
