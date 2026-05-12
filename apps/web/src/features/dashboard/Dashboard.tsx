import { useAuthStore } from '@/shared/state/auth-store';

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-slate-500">Slice 1 active — auth, org, settings, team, audit.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'MRR', value: '—', hint: 'Slice 9' },
          { label: 'Overdue ₹', value: '—', hint: 'Slice 7' },
          { label: 'Renewals (30d)', value: '—', hint: 'Slice 4' },
        ].map((c) => (
          <div className="card" key={c.label}>
            <div className="card-body">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="text-3xl font-semibold mt-1">{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
