# Backend

Express and TypeScript backend for the Autonomous Mining Equipment Market Map.

## Requirements

- Node.js 22
- npm
- PostgreSQL with PostGIS, started through the root Docker Compose stack

## Getting started

```sh
npm ci
npm run dev
```

Copy the repository root `.env.example` to `.env` before starting the backend.
The API starts on `http://localhost:3000` by default. Use the `PORT` environment
variable to select another port. `DATABASE_URL` is required; when the backend
runs in Docker Compose, its database host is the `db` service.

## Available scripts

- `npm run dev` starts the API with automatic reloads.
- `npm run build` compiles TypeScript into `dist/`.
- `npm start` runs the compiled server.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` checks TypeScript without producing build output.

## Health check

```text
GET /health
```

This endpoint reports API process liveness and preserves the response
`{"status":"ok"}`.

```text
GET /health/database
```

The database health endpoint runs a query against PostgreSQL and calls
`postgis_version()`. It returns HTTP 200 only when both the API and PostGIS
database are ready, and HTTP 503 when the database is unavailable.
