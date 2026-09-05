# Development Guide

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop

## Install

From the repository root:

```powershell
npm install
```

The repository uses npm workspaces for `frontend` and `backend`.

## Configure Environment

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Local defaults:

```text
Frontend: 5173
Backend: 4000
PostgreSQL: 5432
Database: aisle_dev
```

Set Razorpay test keys in `.env` to exercise payments. Do not commit real credentials.

## Start the Database

```powershell
docker compose up -d postgres
docker ps
```

Stop it with `docker compose stop postgres`. Remove the local database volume only for a deliberate clean reset:

```powershell
docker compose down -v
```

## Migrate and Seed

```powershell
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

Migrations and seeds are ordered SQL files. The migration runner tracks applied files. Seeds use conflict-safe inserts and can be rerun.

## Run the Applications

Backend terminal:

```powershell
npm run dev --workspace backend
```

Frontend terminal:

```powershell
npm run dev --workspace frontend
```

Open `http://localhost:5173`. The frontend uses `VITE_API_BASE_URL` and defaults to `http://localhost:4000/api`.

## Useful Commands

```powershell
npm run build
npm run typecheck
npm run lint
npm test --workspace backend
npm run build --workspace backend
npm run build --workspace frontend
```

## Development Workflow

1. Start PostgreSQL.
2. Apply migrations.
3. Seed or reset development data.
4. Start backend and frontend dev servers.
5. Use a demo buyer to test search, recommendations, cart, checkout, and payment.
6. Use a demo merchant to test catalog, analytics, growth opportunities, and campaign APIs.
7. Run lint, typecheck, and focused tests before submitting changes.

## Testing Strategy

Backend tests use Node's test runner through `tsx`. Services are dependency-injected so ranking and guardrail behavior can be tested without a live database.

Coverage includes catalog transformation, search filters, structured intent, soft preference parsing, recommendation budget behavior, upsell stretch, cross-sell co-purchase ranking, purchased-product exclusion, `DO_NOTHING`, role isolation, cart and checkout validation, policies, approvals, payment verification, recovery, analytics, and audit ownership.

## Code Conventions

- Keep routes thin.
- Put business rules in services.
- Put SQL in repositories.
- Use authenticated identity from middleware; never trust buyer or merchant IDs from request bodies.
- Revalidate product availability and price before high-impact actions.
- Keep agent tools narrow and explicit.
- Return concise user-facing explanations, never internal chain-of-thought.
- Add audit records for important agent and state-changing decisions.
- Prefer deterministic, injectable logic for ranking and eligibility.

## Operational Boundaries

The current campaign system persists drafts, approval, scheduling state, runs, delivery jobs, idempotency keys, and events. It does not yet include a production message provider or worker process.

The recommendation layer retrieves candidates before ranking and does not require an LLM call for every product. Actual throughput depends on the deployment's database, Node.js resources, cache strategy, and any model provider. Load testing is required before making capacity claims.
