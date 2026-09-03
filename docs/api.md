## Buyer Agent

`POST /api/agent/buyer/chat` is authenticated and restricted to buyers. It accepts `{ "message": "...", "action": { "type": "add_to_cart", "productId": "..." } }` and returns a grounded response with `message`, `state`, `products`, `actions`, and an optional cart summary.

The agent delegates to the existing catalog search, recommendation, product detail, cart, and checkout-summary services. It never receives database access, accepts buyer IDs, changes prices or stock, creates payments, or completes checkout without explicit user approval. Checkout preparation only returns the current cart total and `requiresApproval: true`.
## Payments

Buyer payment endpoints use the server-side order total and never accept an amount from the browser:

- `POST /api/payments/create-order` with `{ "orderId": "..." }` creates or reuses a Razorpay order.
- `POST /api/payments/verify` verifies `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`, then marks the AIsle order `PAID` and `CONFIRMED`.
- `POST /api/payments/failure` records a retryable `FAILED` payment.

Razorpay webhooks are deferred until webhook secret configuration and raw-body handling are added; the browser callback is not trusted for payment state.
# API

## Health

### `GET /api/health`

Returns the backend health status and database connectivity state.

Example response:

```json
{
  "status": "ok",
  "service": "aisle-backend",
  "database": {
    "connected": true
  },
  "timestamp": "2026-08-24T00:00:00.000Z"
}
```

## Auth

### `POST /api/auth/register`

Creates a buyer or merchant account and returns the current user plus a bearer token.

```json
{
  "name": "Ada Merchant",
  "email": "ada@example.com",
  "password": "password123",
  "role": "MERCHANT",
  "storeName": "Ada's Store"
}
```

### `POST /api/auth/login`

Authenticates an existing user and returns the current user plus a bearer token.

```json
{
  "email": "ada@example.com",
  "password": "password123"
}
```

### `POST /api/auth/logout`

Requires a bearer token. Stateless JWT logout is completed by clearing the token on the client.

### `GET /api/auth/me`

Requires a bearer token and returns the current user.

### Role Checks

The backend includes reusable authentication and role middleware. The current protected role-check routes are:

- `GET /api/auth/merchant`: requires `MERCHANT`.
- `GET /api/auth/buyer`: requires `BUYER`.

## AI-Readable Catalog

`GET /api/agent/catalog` and `GET /api/agent/catalog/:productId` require a bearer token and expose a deterministic, agent-oriented representation of products. The catalog includes only `ACTIVE` products with stock above zero. It returns internal product and merchant IDs, price, currency, availability, stock, status, attributes, and `use_cases`; it never returns user records or credentials.

```json
{
  "product_id": "...",
  "merchant_id": "...",
  "price": 6999,
  "currency": "INR",
  "availability": "IN_STOCK",
  "attributes": { "brand": "Nike", "use_case": "Daily Running" },
  "use_cases": ["Daily Running"]
}
```

## Buyer Search

`GET /api/products/search` requires a buyer bearer token. It supports `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `attributes`, `page`, `limit`, and `sort` (`relevance`, `price_asc`, or `price_desc`). Attributes accept JSON or `key:value` pairs separated by commas. Results contain deterministic scores and match reasons; active, in-stock catalog products are used as the discovery source.

`GET /api/products/search/:productId` returns a discoverable product for the buyer details view.

## Cart and Orders

Cart endpoints require a buyer bearer token: `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`, and `DELETE /api/cart`. Add and update requests accept a positive integer `quantity`; product status, stock, price, and all display data are read from PostgreSQL.

`POST /api/orders/checkout` creates a `PENDING` order and `PENDING` payment from the buyer's current cart. The server recalculates each item subtotal and total from current database prices, stores those unit prices in `order_items`, and clears the cart in the same transaction. Product rows are locked during validation with `FOR UPDATE`. This phase validates stock but does not reserve or decrement it, because payment is not integrated yet; concurrent checkouts therefore cannot make stock negative, while a future payment phase should add reservation/expiry semantics.

`GET /api/orders` and `GET /api/orders/:id` are scoped by authenticated identity: buyers see their own orders and merchants see orders assigned to their merchant. The current schema supports one merchant per order, so checkout rejects a cart containing products from multiple merchants.

## Recommendations

`POST /api/recommendations` requires a buyer bearer token and accepts `{ "query": "running shoes under 8000", "maxResults": 3 }`. It uses the active, in-stock catalog and deterministic search ranking, then returns grounded recommendations, scores, matched requirements, and price/ranking trade-offs. No LLM or invented catalog facts are used.
