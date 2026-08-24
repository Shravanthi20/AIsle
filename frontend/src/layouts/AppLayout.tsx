import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Merchant', to: '/merchant' },
  { label: 'Buyer', to: '/buyer' },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink to="/merchant" className="text-lg font-semibold">
            AIsle
          </NavLink>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
