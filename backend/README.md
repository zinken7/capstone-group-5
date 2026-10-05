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
- `npm run admin:create -- --email <email> [--root]` creates an administrator account.
- `npm run db:seed` loads the synthetic seed dataset; it needs a local `psql` client.
## Database migrations

Database migrations are stored in `migrations/` and are applied in filename order.

Make sure PostgreSQL/PostGIS is running and `DATABASE_URL` is configured, then run:

```sh
npm run db:migrate
```

## Data access

Backend requests flow route → service → repository → Drizzle → PostgreSQL/PostGIS:

- routes (`src/routes/`) handle HTTP concerns: parsing, validation and response shapes;
- services (`src/services/`) hold business rules and transactions — `withTransaction` hands repositories a `tx.db` Drizzle client bound to the transaction's connection;
- repositories (`src/repositories/`) access the database through Drizzle (`db` from `src/database.ts`) and the typed schema in `src/db/`.

API DTOs stay separate from persistence rows: routes shape responses from repository results rather than returning rows directly.

### Typed schema and drift check

`src/db/schema.ts` and `src/db/relations.ts` are generated — do not edit them by hand. They are introspected from a freshly migrated database:

- `npm run db:schema:update` replays `migrations/` into a scratch database, re-introspects it with drizzle-kit and rewrites `src/db/`;
- `npm run db:schema:check` does the same and fails when the committed files differ, printing the diff. CI runs it on every backend change.

Introspection only runs against PostgreSQL 17 with PostGIS 3.5 — the CI image (`postgis/postgis:17-3.5`) — because different PostgreSQL versions introspect the same schema differently. Both commands use `DATABASE_URL` when it already points at those versions; otherwise they start the Docker Compose `db` service (the same image) and use that, which needs `POSTGRES_USER`/`POSTGRES_PASSWORD` in the root `.env`. Any other server, such as a local PostgreSQL 16, is refused with instructions.

The SQL files in `migrations/` remain the only migration authority, for fresh and existing databases alike, and `npm run db:migrate` applies them. drizzle-kit is used for introspection only; never generate or apply drizzle-kit migrations. To change the schema: write a new SQL migration, run `npm run db:migrate`, then `npm run db:schema:update`, and commit the migration together with the regenerated schema.

Constraints the typed schema cannot represent stay database-native and live only in the migrations: the `updated_at` maintenance, append-only history, active-admin review, evidence/deployment locking and verified-requires-evidence triggers and functions.

### Raw SQL rule

Drizzle is the default data-access path for feature code. Raw SQL is allowed only where PostGIS or complex SQL is materially clearer, must run through Drizzle's parameterised `sql` template (never string concatenation), and needs a justifying comment — the spatial map query in `src/repositories/sites.ts` is the canonical example. The `query()` helper in `src/database.ts` remains for tests and fixtures; do not add new direct `pg` query strings in feature code.

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


## Administrator accounts

Administrator sign-in needs `SESSION_SECRET` (at least 32 characters) in the
environment; `.env.example` has a local value. Create an account with:

```sh
npm run admin:create -- --email reviewer@example.com          # administrator
npm run admin:create -- --email lead@example.com --root       # root administrator
```

The command prints a temporary password once; it must be changed at first
sign-in. Root accounts can only be created this way. With Docker Compose, run it
inside the backend container:
`docker compose exec backend npm run admin:create -- --email … [--root]`.

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

A stale local test database created before migration `002` fails the suite's migration step; drop it (`dropdb amem_dev_test`) and the global setup recreates it. The same applies to a local development database seeded before `002` (old `line_of_sight_remote` data): `002` refuses to reclassify it, so drop and recreate the database, then rerun `npm run db:migrate` and `npm run db:seed`.

As a second safeguard, `resetDatabase()` in `src/test/fixtures.ts` refuses to truncate any database whose name is not `test` or does not end in `_test`.

## Shutdown

On `SIGINT` or `SIGTERM` the server stops accepting new connections, waits for in-flight requests to finish, closes the PostgreSQL connection pool and exits with code 0. If that takes longer than 10 seconds the process exits with code 1. The Docker Compose backend service runs with `init: true`, so signals from `docker compose stop` reach the Node process.
