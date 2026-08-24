import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-ink">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">AIsle</p>
        <h1 className="mt-3 text-3xl font-semibold">AI commerce workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose an initial experience to continue. Authentication will be wired in a future phase.
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            to="/merchant"
            className="rounded-md bg-ink px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Merchant Dashboard
          </Link>
          <Link
            to="/buyer"
            className="rounded-md border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            AI Buyer Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
