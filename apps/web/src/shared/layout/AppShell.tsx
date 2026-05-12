import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/shared/state/auth-store';
import { api } from '@/shared/api/client';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'FINANCE', 'ACCOUNT_MANAGER', 'VIEWER'] },
  { to: '/settings', label: 'Settings', roles: ['ADMIN', 'FINANCE', 'ACCOUNT_MANAGER', 'VIEWER'] },
  { to: '/team', label: 'Team', roles: ['ADMIN'] },
  { to: '/audit', label: 'Audit log', roles: ['ADMIN', 'FINANCE'] },
] as const;

export function AppShell() {
  const { user, refreshToken, clear } = useAuthStore();
  const nav = useNavigate();

  async function logout() {
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    clear();
    nav('/login');
  }

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r bg-white">
        <div className="p-4 border-b">
          <p className="font-semibold text-brand-700">Dranzo Payments</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-500">Role: {user?.role}</p>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.filter((item) => user && (item.roles as readonly string[]).includes(user.role)).map(
            (item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'block px-3 py-2 rounded-md text-sm',
                    isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="p-2 border-t mt-4">
          <button className="btn btn-secondary w-full" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
