# API Reference

Base URL: `http://localhost:4000/api`. Protected endpoints require `Authorization: Bearer <token>`.

## Health and Authentication

- `GET /health`: API and database connectivity.
- `POST /auth/register`: create a buyer or merchant account.
- `POST /auth/login`: return the authenticated user and JWT.
- `GET /auth/me`: return the current identity.

Example login:

```json
{ "email": "ada@example.com", "password": "password123" }
```

## Catalog and Search

- `GET /agent/catalog`: active, in-stock agent-readable products.
- `GET /agent/catalog/:productId`: one discoverable product.
- `GET /products/search`: buyer search.
- `GET /products/search/:productId`: buyer product detail.

Search supports `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `attributes`, `page`, `limit`, and `sort` (`relevance`, `price_asc`, `price_desc`). Attributes accept JSON or `key:value,key:value`. Results contain deterministic `match_score` and `match_reasons` values.

## Customer Recommendations

### `POST /recommendations`

Buyer-only endpoint:

```json
{
  "query": "laptop for coding around 70000 preferably lightweight",
  "maxResults": 3
}
```

The response contains grounded products, score, confidence, concise reason, matched requirements, matched soft preferences, and tradeoffs. Strict terms such as `under`, `below`, and `up to` create hard price limits. `around` can allow a controlled 10 percent stretch.

## Buyer Agent

### `POST /agent/buyer/chat`

```json
{ "message": "Show me a laptop for coding around 70000" }
```

The response includes `message`, `state`, `products`, `actions`, and an optional cart summary. Follow-up language such as `upgrade`, `premium`, `accessories`, or `complete my setup` invokes upsell or cross-sell tools.

Explicit cart action:

```json
{
  "message": "Add the first one to my cart",
  "action": { "type": "add_to_cart", "productId": "<product-id>", "quantity": 1 }
}
```

## Cart, Orders, and Payment

Buyer-only endpoints:

- `GET /cart`
- `POST /cart/items`
- `PUT /cart/items/:productId`
- `DELETE /cart/items/:productId`
- `DELETE /cart`
- `POST /orders/checkout`
- `GET /orders`
- `GET /orders/:id`

Checkout recalculates totals from current prices, locks product rows while validating stock, enforces one merchant per order, and creates a pending order.

Payment endpoints:

- `POST /payments/create-order`
- `POST /payments/verify`
- `POST /payments/failure`

The browser cannot choose the authoritative payment amount. Razorpay verification is server-side and local development uses test credentials.

## Merchant Catalog and Analytics

Merchant-only endpoints:

- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /agent/merchant/chat`
- `GET /analytics/merchant`
- `GET /analytics/merchant/products`
- `GET /analytics/merchant/orders`

All merchant product and order access is scoped to the authenticated merchant profile.

## Growth Opportunities

### `GET /growth/opportunities`

Returns ranked opportunities with action type, trigger or `why now`, candidate products, customer value, business value, opportunity score, confidence, reason, and approval requirement. Optional query parameter: `productId`.

The current detector evaluates up to 25 merchant products per request and returns only opportunities with a relevant available upsell or cross-sell candidate.

## Campaigns

Merchant-only endpoints:

- `GET /growth/campaigns`
- `POST /growth/campaigns`
- `POST /growth/campaigns/:id/approve`
- `POST /growth/campaigns/:id/schedule`
- `POST /growth/campaigns/:id/run`
- `POST /growth/campaigns/:id/events`

Create a draft:

```json
{
  "name": "Laptop accessories campaign",
  "objective": "CROSS_SELL",
  "audience": { "purchasedCategory": "Laptops", "withinDays": 30 },
  "productIds": ["<merchant-product-id>"],
  "content": { "headline": "Complete your setup" }
}
```

Campaign products must be active, in stock, and owned by the merchant. A campaign must be approved before it can be scheduled or run.

Run a campaign:

```json
{ "recipients": ["<buyer-id>"] }
```

The run endpoint creates durable delivery records with idempotency keys. A production delivery adapter and background scheduler are not included yet.

Record an event:

```json
{
  "eventType": "campaign_clicked",
  "recipientId": "<buyer-id>",
  "productId": "<product-id>",
  "metadata": {}
}
```

Supported event types include `campaign_delivered`, `campaign_clicked`, `campaign_converted`, `recommendation_rejected`, `upsell_accepted`, and `cross_sell_accepted`.

## Policies, Approvals, Audit, and Recovery

Buyer policy endpoints constrain purchase actions and can return `ALLOW`, `DENY`, or `REQUIRES_APPROVAL`. Approval endpoints operate on an exact cart snapshot, amount, currency, and expiry.

`GET /audit` returns records scoped to the authenticated buyer or merchant. Audit entries capture actor, action, entity, context, decision, explanation, and timestamp. Payment recovery endpoints expose retryable failed-payment state without creating duplicate payment orders.
