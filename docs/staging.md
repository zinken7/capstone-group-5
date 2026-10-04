# Staging

Staging hosts the integrated build for team verification and client
demonstrations. The frontend and backend are two Vercel projects built from this
repository. The database is Neon PostgreSQL with PostGIS, connected to the
backend project through the Vercel Marketplace. Every component runs on a free
tier.

| Component | Hosted as | Root directory | URL |
| --- | --- | --- | --- |
| Frontend | Vercel project `capstone-group-5` | `frontend` | https://capstone-group-5.vercel.app |
| Backend | Vercel project `capstone-group-5-api` | `backend` | https://capstone-group-5-api.vercel.app |
| Database | Neon `capstone-group-5-staging`, Sydney (`ap-southeast-2`) | none | Provided to the backend as `DATABASE_URL` |

## Request path

The browser only talks to the frontend domain. `frontend/vercel.json` rewrites
`/api/*` to the backend and serves `index.html` for every other path, so
`BrowserRouter` routes such as `/equipment` survive a reload. Because the browser
sees a single origin, the frontend keeps its default `VITE_API_BASE_URL=/api`
and the backend needs no CORS configuration.

The backend runs as one Vercel Function. Vercel detects Express from the default
export in `backend/src/app.ts`; `backend/src/server.ts`, which listens on a port
and handles graceful shutdown, is used only by Docker Compose and `npm start`.
`backend/vercel.json` pins the function to `syd1`, next to the database and
close to Perth.

Health endpoints are not rewritten; check them on the backend domain.

## Environment variables

**Backend.** The Neon integration sets its variables for Development, Preview
and Production. The backend uses only:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection, used by the running backend |
| `DATABASE_URL_UNPOOLED` | Direct connection, used for migrations and seed data |

The other Neon variables (`PG*`, `POSTGRES_*`, `NEON_PROJECT_ID`,
`VITE_NEON_AUTH_URL`) are unused. If the database is ever reconnected, leave the
variable prefix empty: the backend reads exactly `DATABASE_URL`.

**Frontend.** None. `VITE_API_BASE_URL` defaults to `/api`. `VITE_*` values are
embedded in the browser bundle and must never hold secrets.

Both projects use Node.js 22.x, matching `engines` in each `package.json`. For
branch previews, Vercel skips a project when a commit does not change its root
directory.

## Deploying

Production deployments run from GitHub Actions, not from Vercel's Git
integration:

- On every push to `main`, `.github/workflows/lint.yml` runs CI, then
  **Migrate staging database**, then **Deploy staging frontend** and
  **Deploy staging backend**. Each deploy job runs `vercel deploy --prod` from
  the repository root, and Vercel builds the project's root directory. A failed
  check or migration stops both deploys, so new code never runs against an old
  schema.
- `git.deploymentEnabled` in each `vercel.json` turns the Git integration off
  for `main`. It still builds preview deployments for other branches and links
  them on the pull request. Previews use the staging database and are protected
  by Vercel Authentication, so only members of the owning Vercel account can
  open them.

The deploy jobs use M1's Vercel token because the Hobby account blocks Git
deployments of commits by anyone who is not on it; this is what stopped #74
from deploying. They read their configuration from the `staging` GitHub
environment, which only `main` can use (see
[Migrations and seed data](#migrations-and-seed-data)):

| Name | Kind | Value |
| --- | --- | --- |
| `VERCEL_TOKEN` | Secret | Vercel access token created by M1 |
| `VERCEL_ORG_ID` | Variable | Vercel account ID |
| `VERCEL_FRONTEND_PROJECT_ID` | Variable | ID of `capstone-group-5` |
| `VERCEL_BACKEND_PROJECT_ID` | Variable | ID of `capstone-group-5-api` |

The IDs are in `.vercel/repo.json` after `npx vercel link --repo`. Before the
token expires, create a new one under Vercel → Account Settings → Tokens, scoped
to M1's projects, copy it and store it with any whitespace removed:

```sh
pbpaste | tr -d '[:space:]' | gh secret set VERCEL_TOKEN --env staging
```

A trailing newline or space in the secret makes the Vercel CLI reject it with
`You defined "--token", but its contents are invalid`. After updating the
secret, re-run the failed deploy jobs with `gh run rerun <run-id> --failed`.

To deploy from a local checkout instead, for example to try a configuration
change before opening a pull request:

```sh
npx vercel login
npx vercel link --repo           # once per checkout; links both projects
cd backend                       # or: cd frontend
npx vercel deploy --prod
```

A CLI deployment uploads the working tree, including uncommitted changes, and
replaces the current production deployment of that project until the next push
to `main` deploys again.

## Migrations and seed data

Migrations run automatically; the seed never does.

| What | When | Where |
| --- | --- | --- |
| `npm run db:migrate` | Every push to `main`, after CI (the `Backend Lint` gate) passes | **Migrate staging database** job in `.github/workflows/lint.yml` |
| `npm run db:migrate`, then `npm run db:seed` | On demand: Actions → **Seed staging database** → Run workflow on `main` | `.github/workflows/seed-staging.yml` |

Both connect through `STAGING_DATABASE_URL`, a secret of the `staging` GitHub
environment, which only `main` can deploy to. It holds Neon's direct
(unpooled) connection string: `backend/src/migrate.ts` holds a session-level
advisory lock, which Neon's pooled endpoint does not preserve between
statements. The two jobs share a concurrency group, so they never run at the
same time.

The environment is the access boundary for both the database and the Vercel
token. Its secrets are not defined at repository level, so a job without
`environment: staging` cannot read them, and the environment's deployment branch
policy (Settings → Environments → `staging`) admits only `main`: GitHub rejects
a job from any other branch before its first step. Every job that uses the
environment also checks `github.ref` in its `if` condition, but that only
documents the intent, because a branch can edit its own copy of a workflow.
Keep the branch policy when changing the environment.

The seed loads the synthetic dataset in `backend/seeds/seed_global.sql` in one
transaction and can be re-run: rows that already exist are skipped, and an
existing ID with different content aborts the whole load rather than
overwriting it. Do not re-run it once staging holds data that should replace
the synthetic records, because it re-inserts any seed rows that were deleted.

If the Neon integration is reconnected, update the secret from a local
checkout:

```sh
cd backend
npx vercel env pull /tmp/staging.env --environment=production --yes
(set -a; . /tmp/staging.env; set +a; printf %s "$DATABASE_URL_UNPOOLED" | gh secret set STAGING_DATABASE_URL --env staging)
rm /tmp/staging.env
```

To run the same commands by hand, replace the `gh secret set` line with:

```sh
(set -a; . /tmp/staging.env; set +a; DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate)
(set -a; . /tmp/staging.env; set +a; DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:seed)
```

Variables set this way take precedence over a local root `.env`, so the command
cannot fall back to the Docker Compose database. `npm run db:seed` needs a local
`psql` client. `pg` prints a warning about `sslmode=require` semantics changing
in a future major version; it does not affect the connection.

Verify afterwards:

```sh
curl --fail https://capstone-group-5-api.vercel.app/health/database
curl --fail https://capstone-group-5.vercel.app/api/map
```

## Rollback

Use Vercel Instant Rollback from the **Instant Rollback** button on the
project's production deployment tile. Frontend and backend roll back
independently. The Hobby plan offers only the immediately previous production
deployment; to go further back, redeploy an older deployment from the
**Deployments** list.

After a rollback, merges to `main` no longer go live automatically. Select
**Undo Rollback** on the production deployment tile, or run
`npx vercel promote <deployment-url>`, once a fixed deployment is ready.

Instant Rollback does not touch the database. Reverse a schema change with a new
migration.

## Known limitations

- Staging holds only the synthetic seed dataset. Its companies, sites and
  evidence are invented, evidence URLs use the reserved `evidence.invalid`
  domain, and its verification states are test fixtures.
- Neon runs PostgreSQL 18.6 with PostGIS 3.6, whereas Docker Compose and CI use
  `postgis/postgis:17-3.5`. Migrations run on both; avoid SQL that needs a
  version-specific feature.
- Staging does not run `backend/Dockerfile`; the image is exercised only
  locally. Deployment to UWA hosting is planned in `docs/project_plan.md`
  section 6.
- Neon Free allows 100 CU-hours and 0.5 GB of storage per project per month.
  Compute suspends after 5 minutes without queries, so the first request after
  a quiet period is slightly slower.
- The Vercel projects belong to M1's Hobby account, which is limited to
  non-commercial use and does not support team members. Other members cannot
  open the dashboard or preview deployments, and Vercel blocks Git deployments
  of their commits, including branch previews; `main` is deployed from GitHub
  Actions for this reason. Ask M1 for deployment changes.
