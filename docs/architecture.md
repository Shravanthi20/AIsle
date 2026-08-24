# Architecture

AIsle is a web-based AI Growth & Agentic Commerce platform for merchants and buyers. The platform connects merchant catalog data, AI-powered product understanding, buyer intent, recommendations, checkout, auditability, and analytics.

## User Experiences

The Merchant Dashboard helps merchants understand AI-attributed sales, catalog health, recommendation performance, growth opportunities, transactions, and overall performance.

The AI Buyer Dashboard provides an AI-assisted shopping experience where buyers can search for products, explore recommendations, compare products, build a cart, and complete purchase flows.

## Frontend Architecture

The frontend is a React, TypeScript, Vite, and Tailwind CSS application. It uses React Router for navigation and separates reusable UI, layouts, pages, services, hooks, types, utilities, and constants.

## Backend Architecture

The backend is a Node.js, TypeScript, and Express API. It follows a layered structure:

- Routes define HTTP endpoints.
- Controllers handle request and response boundaries.
- Services contain business logic.
- Repositories encapsulate data access.
- Configuration modules manage environment and infrastructure setup.

## Database Layer

PostgreSQL is used as the application database. Local development runs PostgreSQL through Docker Compose with a persistent volume. The backend owns the database connection module and exposes database health through the API health endpoint.

## Project Structure

- `frontend/`: Buyer and merchant web application.
- `backend/`: Express API and backend business logic.
- `docs/`: Product and engineering documentation.
- `docker/`: Docker-related project assets.
- `docker-compose.yml`: Local PostgreSQL service.
