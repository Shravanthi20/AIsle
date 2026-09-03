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
