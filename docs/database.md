# Database

The initial AIsle schema models the first commerce milestone:

```text
PostgreSQL
   |
Products
   |
Orders
   |
Users
```

## Migrations

SQL migrations live in `backend/db/migrations` and are applied in filename order.

Run migrations against the configured `DATABASE_URL`:

```bash
npm run db:migrate --workspace backend
```

Applied migrations are tracked in the `schema_migrations` table.

The migration runner uses the shared PostgreSQL pool from `backend/src/database/db.ts`, executes files in deterministic filename order, wraps each migration in a transaction, and skips migrations that already exist in `schema_migrations`.

## Seeds

Development seed files live in `backend/db/seeds` and are applied in filename order.

```bash
npm run db:seed --workspace backend
```

The current seed creates demo merchants, buyers, products, product attributes, carts, and historical orders. Demo passwords are stored as `password_hash` values, not plaintext.

## Environment

The database connection uses `DATABASE_URL` from the backend environment. Local defaults are documented in `.env.example`:

```ini
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aisle_dev
POSTGRES_USER=aisle_user
POSTGRES_PASSWORD=aisle_password
DATABASE_URL=postgresql://aisle_user:aisle_password@localhost:5432/aisle_dev
```

## Access Pattern

Backend database access should flow through one shared pool:

```text
database/db.ts
  |
repositories
  |
services
  |
controllers
  |
routes
```

Repositories should not create their own PostgreSQL pools.

## Relationships

```text
users
|-- merchants
|-- carts
`-- orders

merchants
|-- products
`-- orders

products
|-- product_attributes
|-- cart_items
`-- order_items

carts
`-- cart_items

orders
`-- order_items
```

## Initial Schema

### Users

`users` stores platform accounts for both merchants and buyers.

- `role` uses the `user_role` enum: `MERCHANT`, `BUYER`.
- `email` is unique.
- `created_at` and `updated_at` track account timestamps.

### Merchants

`merchants` stores merchant storefronts and links each store to one merchant user.

- `user_id` references `users.id`.
- `user_id` is unique so one merchant user owns one store in the initial model.
- merchant deletion is restricted where historical records depend on it.

### Products

`products` stores the merchant catalog.

### AI-Readable Catalog

PostgreSQL remains the source of truth for the AI-readable catalog. The backend reads `products` and `product_attributes`, then deterministically maps them to an agent-oriented product object; no duplicate product store and no LLM are used. Discovery returns only active, in-stock products. Attributes become a key/value object and `use_case` is also exposed as a `use_cases` array for later buyer-agent use.

- `merchant_id` references `merchants.id`.
- `price` and `stock` are constrained to non-negative values.
- `status` uses the `product_status` enum: `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`.
- `updated_at` is maintained by a PostgreSQL trigger.
- product deletion is restricted when historical order items reference it.

### Product Attributes

`product_attributes` stores flexible product facts for AI discovery.

Examples:

```ini
color = black
brand = Nike
size = 9
material = mesh
```

- `product_id` references `products.id`.
- `(product_id, key)` is unique to avoid duplicate attributes on a product.

### Carts

`carts` stores one active cart per buyer.

- `buyer_id` references `users.id`.
- `buyer_id` is unique for the initial one-active-cart model.

### Cart Items

`cart_items` stores products inside a cart.

- `cart_id` references `carts.id`.
- `product_id` references `products.id`.
- `quantity` must be greater than zero.
- `(cart_id, product_id)` is unique to avoid duplicate product rows.

### Orders

`orders` stores purchases made by buyers from merchants.

- `buyer_id` references `users.id`.
- `merchant_id` references `merchants.id`.
- `status` uses the `order_status` enum: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.
- `payment_status` uses the `payment_status` enum: `PENDING`, `PAID`, `FAILED`, `REFUNDED`.
- users and merchants referenced by historical orders cannot be cascade-deleted.

### Order Items

`order_items` stores line items in an order.

- `order_id` references `orders.id`.
- `product_id` references `products.id`.
- `quantity` must be greater than zero.
- `unit_price` is captured separately from the current product price.
