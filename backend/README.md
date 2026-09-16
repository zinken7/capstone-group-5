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
- `npm run db:seed:reference` upserts the reference catalogue (regions, companies, machine models, technology products).
- `npm run db:seed:fixtures` reloads the synthetic development data (sites, roles, deployments). Refuses when `NODE_ENV=production`.
- `npm run db:seed` runs both.

## Database migrations

Database migrations are stored in `migrations/` and are applied in filename order.

Make sure PostgreSQL/PostGIS is running and `DATABASE_URL` is configured, then run:

```sh
npm run db:migrate
```

## Seed data

Seed data lives in `seed/` as JSON, in two kinds. `seed/reference/` is the
real, sourced catalogue and loads in every environment by upsert on natural
key. `seed/fixtures/` is synthetic and loads in development and test only, by
truncating the fixture tables and inserting in file order, so a re-run gives
an identical database. See [`seed/README.md`](seed/README.md) for the file
shapes and how to add rows.

```sh
npm run db:migrate
npm run db:seed              # reference catalogue, then fixtures
npm run db:seed:reference    # catalogue only; safe in production
npm run db:seed:fixtures     # fixtures only; refuses under NODE_ENV=production
```

Every file is validated before the first database call; problems are reported
together as `file / key / field / message`.

The Docker backend container runs `db:migrate` and then `db:seed:reference` on
every start, through `docker-entrypoint.sh`. It never loads fixtures.

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

Install dependencies and run the backend automated tests with:

```sh
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

The seed tests in `src/seed/seed.test.ts` run against a migrated database at
`DATABASE_URL` (default `postgres://test:test@localhost:5432/test`), which
they truncate and reload; point them at a throwaway database, never a shared
one. Run `npm run db:migrate` against it first.

The test command exits with a non-zero status if any test fails, making it suitable for use in GitHub Actions.
