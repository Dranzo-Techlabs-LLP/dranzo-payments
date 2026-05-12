import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  ip: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export function Audit() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async (): Promise<{ items: AuditRow[]; total: number }> =>
      (await api.get('/audit?take=200')).data,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-slate-500">Every state-changing action.</p>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr><th>When</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Actor</th><th>IP</th></tr>
              </thead>
              <tbody>
                {data?.items.map((row) => (
                  <tr key={row.id}>
                    <td className="text-xs">{new Date(row.createdAt).toLocaleString()}</td>
                    <td><span className="badge bg-slate-100">{row.action}</span></td>
                    <td>{row.entity}</td>
                    <td className="text-xs text-slate-500">{row.entityId ?? '—'}</td>
                    <td className="text-xs text-slate-500">{row.actorId ?? '—'}</td>
                    <td className="text-xs text-slate-500">{row.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
