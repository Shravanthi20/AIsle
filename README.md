# AIsle

## AI Growth and Agentic Commerce

AIsle is an AI commerce platform with two coordinated agents:

- **AI Shopping Agent**: helps customers discover, compare, and safely purchase products through natural language.
- **AI Growth Agent**: helps merchants find revenue opportunities through personalized upselling, cross-selling, and campaign workflows.

The platform is designed around one principle:

> **AI reasons. Ranking models score. Policies constrain. Agents act.**

That separation makes the system useful without making the catalog, inventory, price, payment, or approval decisions dependent on an opaque model response.

## The Pitch

Most commerce systems treat discovery and growth as separate problems. AIsle connects them.

On the customer side, a buyer can say:

```text
I need a laptop for coding around INR 70,000, preferably lightweight.
```

AIsle extracts the intent, searches only the available catalog, ranks candidates using deterministic signals, explains tradeoffs, and keeps the customer in control of cart and checkout actions.

On the merchant side, the same commerce context can identify:

```text
Customers who bought a laptop have not purchased a laptop bag.
```

The Growth Agent can turn that opportunity into a cross-sell recommendation or an approved campaign. Product relevance comes first; business value is optimized only within customer fit, availability, and policy guardrails.

## Product Flows

### Customer flow

```text
Natural-language request
	-> Structured intent
	-> Candidate retrieval
	-> Deterministic ranking
	-> Recommendation and explanation
	-> Follow-up refinement
	-> Explicit product selection
	-> Cart
	-> Checkout confirmation and policy evaluation
	-> Razorpay payment
	-> Order and audit event
```

### Merchant growth flow

```text
Catalog and order data
	-> Customer/product context
	-> Growth opportunity detection
	-> Upsell or cross-sell ranking
	-> Next best action
	-> Merchant approval
	-> Campaign draft and scheduling
	-> Delivery jobs
	-> Events and attribution
```

## What Makes It Different

### Customer-first recommendations

Customer utility is evaluated using:

- Use-case and category fit
- Explicit mandatory requirements
- Soft preferences
- Price and value
- Product attributes and quality signals
- Availability and stock
- Customer purchase context when available

Strict phrases such as `under`, `below`, and `up to` remain hard price limits. Phrases such as `around` can allow a controlled budget stretch. A better product is presented as a tradeoff, not silently substituted.

### Upsell without pressure

Upsell candidates are higher-value alternatives in the same category or use case. They must be available, relevant, and within the configured stretch. The response includes the price difference and a concise reason such as improved quality, capacity, or fit.

### Cross-sell with evidence

Cross-sell candidates come from:

1. Frequently bought together relationships from paid orders
2. Merchant-defined relationships
3. Compatibility attributes
4. Shared use cases
5. Customer purchase history

Already-purchased and unavailable products are excluded.

### Guardrailed agent actions

Agents do not silently purchase products or mutate carts. State-changing actions pass through the existing cart, order, payment, policy, approval, audit, and recovery services.

### Durable campaigns

Campaigns are persisted as drafts, approvals, runs, deliveries, and events. Delivery jobs receive idempotency keys, allowing retries without creating duplicate jobs.

## Technical Architecture

```text
React + Vite frontend
					|
			Express API
					|
Routes -> Controllers -> Services -> Repositories
					|                 |
			 Policies          AuditService
					|
			 PostgreSQL
					|
	 Razorpay test integration
```

The backend is deliberately layered:

- **Routes** define authenticated HTTP boundaries.
- **Controllers** validate request boundaries and serialize responses.
- **Services** own business rules and orchestration.
- **Repositories** own PostgreSQL queries.
- **Agent tools** expose narrow capabilities to buyer and merchant agents.
- **Policy and approval services** constrain high-impact actions.
- **Audit and recovery services** record decisions and handle failure paths.

### Recommendation path

```text
Query
	-> ShoppingIntentService
	-> ProductSearchService / CandidateRetrievalService
	-> Deterministic scoring
	-> Top-N recommendations
	-> User-facing explanation
```

The system does not call an LLM once per product. Candidate retrieval and scoring happen in normal application code, which keeps the architecture suitable for high request volume. An external LLM can be added for intent or explanation enrichment without handing it the entire catalog.

### Growth path

```text
CommerceContextService
	-> UpsellService / CrossSellService
	-> NextBestActionService
	-> GrowthOpportunityService
	-> CampaignService
```

`DO_NOTHING` is a valid decision when no relevant, available opportunity exists.

## Repository Layout

```text
frontend/                  React buyer and merchant application
backend/src/agents/        Buyer and merchant agents plus tools
backend/src/services/      Commerce, search, cart, payment, growth services
backend/src/repositories/  PostgreSQL data access
backend/src/policy/        Buyer policy and approval workflows
backend/src/audit/         Auditable agent and user decisions
backend/src/recovery/      Payment failure recovery
backend/db/migrations/     Ordered PostgreSQL schema migrations
backend/db/seeds/          Ordered development data seeds
docs/                      Architecture, API, database, and development docs
docker-compose.yml         Local PostgreSQL service
```

## Run Locally

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop

### Install

From the repository root:

```powershell
npm install
```

### Configure

Copy `.env.example` to `.env` and adjust values as needed. Local development defaults to PostgreSQL on port `5432`, the backend on port `4000`, and the frontend on port `5173`.

### Start the database and load data

```powershell
docker compose up -d postgres
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

The development seed creates four merchants with approximately 50 to 60 products each, buyers, carts, product attributes, and sample order history. It is safe to rerun.

### Start the applications

Terminal 1:

```powershell
npm run dev --workspace backend
```

Backend: `http://localhost:4000`

Terminal 2:

```powershell
npm run dev --workspace frontend
```

Frontend: `http://localhost:5173`

### Demo accounts

Merchant accounts use password `aisle_demo_merchant123`:

- `riya@stridehub.test`
- `arjun@soundnest.test`
- `neha@techcrate.test`
- `vikram@homepulse.test`

Buyer accounts use password `aisle_demo_buyer123`:

- `kabir@example.test`
- `ananya@example.test`
- `dev@example.test`

## Main API Surface

All protected routes use a bearer token from login.

| Area            | Key endpoints                                                                 |
| --------------- | ----------------------------------------------------------------------------- |
| Auth            | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`                       |
| Catalog         | `/api/agent/catalog`, `/api/agent/catalog/:productId`                         |
| Search          | `/api/products/search`, `/api/products/search/:productId`                     |
| Recommendations | `POST /api/recommendations`                                                   |
| Buyer agent     | `POST /api/agent/buyer/chat`                                                  |
| Cart and orders | `/api/cart`, `/api/orders/checkout`, `/api/orders`                            |
| Payments        | `/api/payments/create-order`, `/api/payments/verify`, `/api/payments/failure` |
| Merchant agent  | `POST /api/agent/merchant/chat`                                               |
| Growth          | `/api/growth/opportunities`, `/api/growth/campaigns`                          |
| Analytics       | `/api/analytics/merchant`, `/api/analytics/buyer`                             |
| Audit           | `/api/audit`                                                                  |

See [docs/api.md](docs/api.md) for request and response details.

## Quality and Safety

```powershell
npm run lint
npm run typecheck
npm test --workspace backend
```

The backend has focused tests for search, recommendations, upsell, cross-sell, next-best-action, cart, checkout, policies, approvals, payments, recovery, analytics, and role isolation.

## Current Boundaries

The implementation provides durable campaign drafts, approval, scheduling, run creation, delivery records, idempotency, and event recording. A production deployment still needs a real email, SMS, push, or in-app delivery adapter and a background worker for scheduled execution.

Razorpay integration is configured for test-mode credentials. Payment verification is server-side; webhook processing and production payment operations require deployment-specific secrets and configuration.

The current ranking layer is deterministic and catalog-driven. It is architecturally ready for precomputed features, embeddings, caching, and an intent/explanation model, but no load test claim is made until those deployment components are measured in the target infrastructure.

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Database and seeds](docs/database.md)
- [Development guide](docs/development.md)

AIsle is an AI Growth & Agentic Commerce platform designed for the Razorpay buildathon. It helps merchants understand and grow AI-assisted revenue while enabling buyers to discover, compare, and purchase products through an AI shopping experience.

## Product

### Merchant Dashboard

The Merchant Dashboard will help merchants understand how AI contributes to sales. Planned capabilities include catalog visibility, product understanding, recommendation performance, growth opportunities, transaction insights, and revenue analytics.

### AI Buyer Dashboard

The AI Buyer Dashboard will let buyers interact with an AI shopping assistant. Buyers will be able to search products, explore recommendations, compare options, build a cart, and complete purchases through Razorpay checkout.

## Product Flow

Merchant Catalog -> Product Understanding -> Buyer Intent -> Product Discovery -> Recommendations -> Upsell/Cross-sell -> Cart -> Checkout -> Razorpay -> Audit -> Analytics

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express
- PostgreSQL
- Docker

## Repository Structure

- `frontend/`: React, TypeScript, Vite, and Tailwind application for merchant and buyer experiences.
- `backend/`: Node.js, TypeScript, and Express API with layered routes, controllers, services, repositories, and configuration.
- `docs/`: Architecture, API, and development documentation.
- `docker/`: Docker-related project assets for local development.
- `docker-compose.yml`: Local PostgreSQL service configuration.

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop

### Environment Configuration

Copy `.env.example` to `.env` and update values as needed for local development. The example file uses non-production placeholder credentials.

### Install Dependencies

```bash
npm install
```

### Start PostgreSQL

```bash
docker compose up -d postgres
```

### Run Database Migrations

```bash
npm run db:migrate --workspace backend
```

### Seed Development Data

```bash
npm run db:seed --workspace backend
```

### Start Backend

```bash
npm run dev --workspace backend
```

The backend runs on `http://localhost:4000` by default.

### Start Frontend

```bash
npm run dev --workspace frontend
```

The frontend runs on `http://localhost:5173` by default.

## Current Status

The project is currently at the foundation/setup stage. Core application structure, initial routing, health checks, local PostgreSQL configuration, the initial commerce database schema, documentation, and development tooling are in place.

## Roadmap

1. Project foundation
2. Merchant catalog
3. AI-readable catalog
4. Buyer experience
5. Product discovery
6. Recommendation engine
7. Growth agent
8. Cart and checkout
9. Razorpay integration
10. Audit system
11. Merchant analytics
12. Feedback and learning
