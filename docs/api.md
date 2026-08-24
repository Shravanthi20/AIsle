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
