import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-ink">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white"
        >
          Back to login
        </Link>
      </section>
    </main>
  );
}
