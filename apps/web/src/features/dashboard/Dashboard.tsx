import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/state/auth-store';
import { fmtMoney } from '@/shared/lib/money';

interface Summary {
  activeSubscriptions: number;
  upcomingRenewals30d: number;
  overdueAmount: number;
  overdueCount: number;
  tasksDueToday: number;
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<Summary> => (await api.get('/dashboard/summary')).data,
    refetchInterval: 15_000,
  });

  const cards: { label: string; value: string; hint: string; to?: string }[] = [
    { label: 'Active subscriptions', value: String(data?.activeSubscriptions ?? '—'), hint: 'currently billing', to: '/subscriptions' },
    { label: 'Renewals (30d)', value: String(data?.upcomingRenewals30d ?? '—'), hint: 'due to renew', to: '/subscriptions' },
    { label: 'Overdue', value: data ? fmtMoney(data.overdueAmount, 'INR') : '—', hint: `${data?.overdueCount ?? 0} invoice(s)`, to: '/invoices' },
    { label: 'Tasks due today', value: String(data?.tasksDueToday ?? '—'), hint: 'open + overdue', to: '/tasks' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-slate-500">Slices 1–8 live. Reminder → task → invoice → payment loop is active.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link className="card hover:shadow-md transition" to={c.to ?? '#'} key={c.label}>
            <div className="card-body">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="text-3xl font-semibold mt-1">{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.hint}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="card">
        <div className="card-body">
          <h2 className="font-medium mb-2">Quick start</h2>
          <ol className="list-decimal pl-6 text-sm text-slate-700 space-y-1">
            <li><Link className="text-brand-600 underline" to="/clients">Add a client</Link> with its POC contact.</li>
            <li><Link className="text-brand-600 underline" to="/subscriptions">Create a subscription</Link> — pick rate model (flat or per-user), monthly/yearly cycle, and renewal date.</li>
            <li><Link className="text-brand-600 underline" to="/tasks">Run the scheduler</Link> — task cards appear automatically.</li>
            <li>Generate an invoice on the Subscriptions page, then mark it paid in <Link className="text-brand-600 underline" to="/invoices">Invoices</Link>.</li>
            <li><Link className="text-brand-600 underline" to="/compliance">Add a compliance item</Link> — same auto-task flow.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
