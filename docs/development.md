# Development

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop

## Install Dependencies

```bash
npm install
```

## Configure Environment

Copy `.env.example` to `.env` and adjust local values as needed. Do not commit real credentials.

## Start PostgreSQL

```bash
docker compose up -d postgres
```

## Run Database Migrations

```bash
npm run db:migrate --workspace backend
```

## Seed Development Data

```bash
npm run db:seed --workspace backend
```

## Run Backend

```bash
npm run dev --workspace backend
```

Backend default URL: `http://localhost:4000`

## Run Frontend

```bash
npm run dev --workspace frontend
```

Frontend default URL: `http://localhost:5173`

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run format:check
```
