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
- `npm run db:migrate` applies any database migrations that have not already been run.
- `npm run db:seed` loads the synthetic seed dataset; it needs a local `psql` client.
## Database migrations

Database migrations are stored in `migrations/` and are applied in filename order.

Make sure PostgreSQL/PostGIS is running and `DATABASE_URL` is configured, then run:

```sh
npm run db:migrate
```

## Seed data

`seeds/seed_global.sql` loads a synthetic dataset of 200 deployments (133
verified) into a migrated database. Every record is invented. Load it after
the migrations, with `DATABASE_URL` configured as for `db:migrate`:

```sh
npm run db:seed
```

Without a local `psql`, run it through the Docker Compose database container
from the repository root:

```sh
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X' < backend/seeds/seed_global.sql
```

The load runs in one transaction and can be repeated without creating
duplicates. CI loads it twice into a fresh database on every backend change, and
[`docs/staging.md`](../docs/staging.md) describes loading it into staging.


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


## Testing

Start the database, then install dependencies and run the backend automated tests with:

```sh
docker compose up -d db   # from the repository root
npm ci
npm test
```

Backend tests use Vitest and Supertest.

Test files should be placed alongside the source code they test and use the naming convention `*.test.ts`.

For example:

```text
src/app.ts
src/app.test.ts
```

Route and repository tests run against a real PostGIS database, seeding fixtures from `src/test/fixtures.ts` before each case.

The test command exits with a non-zero status if any test fails, making it suitable for use in GitHub Actions.

### Test database

The suite never runs against the development database. `vitest.config.ts` derives the test connection string from `DATABASE_URL` by appending `_test` to the database name (so `autonomous_mining` becomes `autonomous_mining_test`), and a global setup step creates that database and applies migrations before the first test file runs. A `DATABASE_URL` that already names a test database (`test`, or any name ending in `_test`, as in CI) is used unchanged.

Set `TEST_DATABASE_URL` to point the suite at a different database instead.

As a second safeguard, `resetDatabase()` in `src/test/fixtures.ts` refuses to truncate any database whose name is not `test` or does not end in `_test`.

## Shutdown

On `SIGINT` or `SIGTERM` the server stops accepting new connections, waits for in-flight requests to finish, closes the PostgreSQL connection pool and exits with code 0. If that takes longer than 10 seconds the process exits with code 1. The Docker Compose backend service runs with `init: true`, so signals from `docker compose stop` reach the Node process.
