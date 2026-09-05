# Database and Seed Data

AIsle uses PostgreSQL as the source of truth for identity, catalog, inventory, carts, orders, payment state, policies, audits, growth campaigns, and campaign events.

## Migrations

Migrations live in `backend/db/migrations` and run in filename order:

1. `001_initial_commerce_schema.sql`: users, merchants, products, attributes, carts, orders, and order items.
2. `002_payment_integration.sql`: Razorpay identifiers on orders.
3. `003_policy_approval.sql`: buyer policies and approval snapshots.
4. `004_audit_logs.sql`: auditable agent and user decisions.
5. `005_growth_campaigns.sql`: campaign drafts, runs, deliveries, and events.

Run them with:

```powershell
npm run db:migrate --workspace backend
```

The runner records applied filenames in `schema_migrations`, wraps each file in a transaction, and skips files already applied.

## Seed Data

Seed files live in `backend/db/seeds` and run in filename order:

- `001_seed_commerce.sql`: original demo merchants, buyers, products, carts, attributes, and sample orders.
- `002_seed_large_catalog.sql`: fourth merchant plus 50 deterministic generated products for each of the four original merchants, and three clothing merchants with 15 shared Indian-dress color combinations each.

Run them with:

```powershell
npm run db:seed --workspace backend
```

The resulting development catalog contains approximately 50 to 60 products per merchant because original demo products are preserved alongside generated products. The supplemental seed uses deterministic UUIDs and conflict-safe inserts, so it can be rerun without duplicating records.

Demo merchant password: `aisle_demo_merchant123`

Demo buyer password: `aisle_demo_buyer123`

## Core Relationships

```text
users
|-- merchants
|-- carts -- cart_items -- products
`-- orders -- order_items -- products

merchants
|-- products
|-- orders
`-- campaigns -- campaign_runs -- campaign_deliveries
                         `-- campaign_events

products
`-- product_attributes
```

## Core Tables

- `users` and `merchants`: buyer/merchant identity and storefront ownership.
- `products`: merchant-owned catalog, price, currency, stock, image, and status.
- `product_attributes`: flexible facts such as `brand`, `use_case`, `tier`, and `compatibility`.
- `carts` and `cart_items`: one active cart per buyer.
- `orders` and `order_items`: one-merchant checkout with captured historical unit prices.
- `policies` and `approvals`: purchase limits and exact approval snapshots.
- `audit_logs`: actor, action, entity, context, decision, explanation, and timestamp.
- `campaigns`: merchant campaign definition, objective, audience, products, content, status, and schedule.
- `campaign_runs`: execution attempts for approved or scheduled campaigns.
- `campaign_deliveries`: recipient/product jobs with attempts and unique idempotency keys.
- `campaign_events`: delivery, click, conversion, acceptance, and rejection events.

The current schema does not materialize audience membership in a separate table. The run API currently receives recipient IDs; a production segmentation worker can populate delivery jobs from audience criteria later.

## Data Access Rules

```text
database/db.ts
  -> repositories
  -> services
  -> controllers
  -> routes
```

Repositories use the shared PostgreSQL pool. Services enforce role, merchant ownership, stock, state transitions, and policy behavior before repositories are called.
