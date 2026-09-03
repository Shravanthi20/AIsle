import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import type { AuthenticatedUser, UserRole } from '../types/auth';

type AuthMode = 'login' | 'register';

const destinationByRole = {
  MERCHANT: '/merchant',
  BUYER: '/buyer',
} as const;

function getDestination(user: AuthenticatedUser): string {
  return destinationByRole[user.role];
}

export function LoginPage() {
  const { user, login, register, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('MERCHANT');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrorMessage('');
  }, [mode, role]);

  if (!isLoading && user) {
    return <Navigate to={getDestination(user)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const authenticatedUser =
        mode === 'login'
          ? await login({ email, password })
          : await register({
              name,
              email,
              password,
              role,
              storeName: role === 'MERCHANT' ? storeName : undefined,
            });

      const requestedPath = (location.state as { from?: string } | null)?.from;
      const destination =
        requestedPath &&
        ((authenticatedUser.role === 'MERCHANT' && requestedPath.startsWith('/merchant')) ||
          (authenticatedUser.role === 'BUYER' && requestedPath.startsWith('/buyer')))
          ? requestedPath
          : getDestination(authenticatedUser);

      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-ink">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">AIsle</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {mode === 'login' ? 'Sign in to AIsle' : 'Create your AIsle account'}
        </h1>

        <div className="mt-6 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={[
              'rounded px-3 py-2 text-sm font-semibold transition',
              mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink',
            ].join(' ')}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={[
              'rounded px-3 py-2 text-sm font-semibold transition',
              mode === 'register' ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink',
            ].join(' ')}
          >
            Register
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-ink outline-none transition focus:border-mint"
                  autoComplete="name"
                  required
                />
              </label>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Experience</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['MERCHANT', 'BUYER'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={[
                        'rounded-md border px-3 py-2 text-sm font-semibold transition',
                        role === option
                          ? 'border-ink bg-ink text-white'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {option === 'MERCHANT' ? 'Merchant' : 'Buyer'}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'MERCHANT' ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Store name
                  <input
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-ink outline-none transition focus:border-mint"
                    autoComplete="organization"
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-ink outline-none transition focus:border-mint"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-ink outline-none transition focus:border-mint"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </section>
    </main>
  );
}
