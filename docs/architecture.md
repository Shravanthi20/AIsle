# Architecture

## System Intent

AIsle is an AI Growth and Agentic Commerce platform. It serves two roles through one commerce intelligence layer:

- **AI Shopping Agent**: grounded product discovery, comparison, cart, checkout, and payment assistance.
- **AI Growth Agent**: merchant product performance, upsell and cross-sell opportunities, next-best-action decisions, and campaign workflows.

The architecture separates reasoning from authority:

```text
AI / intent reasoning
          |
Candidate retrieval and deterministic ranking
          |
Policy, approval, inventory, and payment guardrails
          |
Agent action and audit event
```

Agents can explain and coordinate actions, but they are not the source of truth for price, stock, identity, payment state, or authorization.

## Runtime Components

```text
React + Vite + Tailwind
        |
        | HTTP / JSON with bearer JWT
        v
Express API
  |       |        |
Buyer   Merchant  Growth / Campaign routes
Agent   Agent
  |       |        |
  +-------+--------+
          |
  Shared commerce services
  - catalog and candidate retrieval
  - intent and recommendation ranking
  - commerce context
  - upsell and cross-sell
  - cart, order, payment
  - policy, approval, audit, recovery
          |
       PostgreSQL
          |
    Razorpay test integration
```

## Frontend

The frontend is a React and TypeScript application built with Vite and Tailwind CSS. React Router separates authenticated buyer and merchant experiences.

### Buyer experience

The buyer dashboard provides a conversational shopping surface. A customer can search naturally, ask follow-up questions, view explanations, explicitly add a product to the cart, review checkout, and continue to payment. Buyer analytics, recent orders, cart state, and audit activity are shown alongside the conversation.

### Merchant experience

The merchant dashboard provides catalog management, product status and stock visibility, analytics, recent audit activity, and a merchant assistant. Growth opportunities and campaign orchestration are currently available through the authenticated backend API and are documented as an API-first capability.

## Backend Layers

- **Routes** define authenticated HTTP boundaries.
- **Controllers** validate request boundaries and serialize responses.
- **Services** own business rules and orchestration.
- **Repositories** own PostgreSQL queries.
- **Agent tools** expose narrow capabilities to buyer and merchant agents.
- **Policy and approval services** constrain high-impact actions.
- **Audit and recovery services** record decisions and handle failure paths.

Important services include `ProductSearchService`, `RecommendationService`, `ShoppingIntentService`, `CommerceContextService`, `UpsellService`, `CrossSellService`, `NextBestActionService`, `GrowthOpportunityService`, and `CampaignService`.

## Customer Recommendation Architecture

```text
Customer message
  -> ShoppingIntentService
  -> ProductSearchService
  -> Candidate set, max 50 for recommendation ranking
  -> Deterministic utility signals
  -> Top-N response, default 3
  -> Buyer agent explanation
```

Hard constraints include active status, stock, explicit search attributes, and strict price language. Soft preferences affect ranking rather than eliminating every candidate. `around` can permit a controlled budget stretch; the response exposes the budget tradeoff.

The current implementation does not require an LLM per product. An LLM can be added at the intent or explanation boundary, with timeout, retry, cache, and fallback behavior, while retrieval and ranking remain normal code.

## Growth Architecture

### Upsell

Upsell candidates must be in stock, belong to the same category, cost more than the source product, and remain within the configured price stretch. Quality, shared use case, customer fit, and price difference contribute to the score.

### Cross-sell

Cross-sell candidates must be available and not already purchased. Paid order items provide frequently-bought-together signals. Compatibility, merchant attributes, shared use cases, and customer history provide additional signals.

### Next best action

The growth decision returns `action`, `products`, `opportunityScore`, `confidence`, `trigger`, `reason`, and `requiresApproval`. `DO_NOTHING` is returned when no candidate clears relevance and availability rules.

## Campaign Architecture

```text
Opportunity
  -> Campaign draft
  -> Product and ownership validation
  -> Merchant approval
  -> Schedule
  -> Run
  -> Idempotent delivery records
  -> Delivery / click / conversion events
```

Campaign state is persisted in PostgreSQL. The current backend creates durable delivery jobs and records events; an external delivery provider and background worker are still deployment work.

## Safety Boundaries

- Buyer and merchant roles are checked on protected routes.
- Buyer cart mutations require an explicit action.
- Checkout recalculates totals from current database prices.
- Product status and stock are revalidated during checkout.
- Purchase policies can allow, deny, or require approval.
- Payment verification uses server-side Razorpay data and signatures.
- Campaign products must belong to the merchant and be active and in stock.
- Audit events record agent requests, recommendations, policy decisions, approvals, campaign decisions, and key actions.
- Payment failure recovery prevents duplicate retry orders.

## Scalability Shape

Candidate retrieval and deterministic ranking avoid sending the full catalog to a model. Product intelligence can be precomputed and cached, safe catalog reads can be cached, and optional LLM calls can use timeouts, retries, backoff, and fallback responses. Campaign delivery can move to a worker queue without changing campaign definitions or event attribution.

This describes architectural scalability, not a load-test claim. Capacity must be measured against the selected PostgreSQL, Node.js, and model-provider deployment.
