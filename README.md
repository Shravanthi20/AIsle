# AIsle

## Overview

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

The project is currently at the foundation/setup stage. Core application structure, initial routing, health checks, local PostgreSQL configuration, documentation, and development tooling are in place.

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
