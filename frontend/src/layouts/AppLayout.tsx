import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const navItems = [
  { label: 'Merchant', to: '/merchant', role: 'MERCHANT' },
  { label: 'Buyer', to: '/buyer', role: 'BUYER' },
  { label: 'Cart', to: '/buyer/cart', role: 'BUYER' },
  { label: 'Orders', to: '/buyer/orders', role: 'BUYER' },
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
    <div className="min-h-screen bg-[#f4f7f5] text-ink">
      <header className="border-b border-[#dce7e3] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <NavLink
            to={user ? fallbackRouteByRole[user.role] : '/login'}
            className="font-serif text-2xl tracking-tight"
          >
            AI<span className="text-mint">sle</span>
          </NavLink>
          <div className="flex items-center gap-4">
            <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'whitespace-nowrap rounded px-3 py-2 text-sm font-semibold transition',
                      isActive ? 'bg-[#17212b] text-white' : 'text-slate-600 hover:bg-[#eaf2ef]',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="button button-secondary"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
