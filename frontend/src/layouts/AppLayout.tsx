import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const navItems = [
  { label: 'Merchant', to: '/merchant', role: 'MERCHANT' },
  { label: 'Buyer', to: '/buyer', role: 'BUYER' },
] as const;

const fallbackRouteByRole = {
  MERCHANT: '/merchant',
  BUYER: '/buyer',
} as const;

const roleLabel = {
  MERCHANT: 'Merchant',
  BUYER: 'Buyer',
} as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const visibleNavItems = navItems.filter((item) => item.role === user?.role);

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink
            to={user ? fallbackRouteByRole[user.role] : '/login'}
            className="text-lg font-semibold"
          >
            AIsle
          </NavLink>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
