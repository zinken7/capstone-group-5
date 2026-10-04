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

Both projects use Node.js 22.x, matching `engines` in each `package.json`, and
skip builds when a commit does not change their root directory.

## Deploying

Both projects are connected to the GitHub repository:

- A merge to `main` deploys the affected project(s) to production.
- Any other pushed branch gets preview deployments, and Vercel links them on the
  pull request. Previews use the staging database and are protected by Vercel
  Authentication, so only members of the owning Vercel account can open them.

Deployments do not run migrations. Apply a pull request's new migrations to
staging before merging it, so that the deployed code finds the schema it
expects.

To deploy from a local checkout instead, for example to try a configuration
change before opening a pull request:

```sh
npx vercel login
npx vercel link --repo           # once per checkout; links both projects
cd backend                       # or: cd frontend
npx vercel deploy --prod
```

A CLI deployment uploads the working tree, including uncommitted changes, and
replaces the current production deployment of that project.

## Migrations and seed data

Run database commands through the direct connection. `backend/src/migrate.ts`
holds a session-level advisory lock, which Neon's pooled endpoint does not
preserve between statements.

```sh
cd backend
npx vercel env pull /tmp/staging.env --environment=production --yes
(set -a; . /tmp/staging.env; set +a; DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate)
(set -a; . /tmp/staging.env; set +a; psql "$DATABASE_URL_UNPOOLED" -X -f ../docs/database/seeds/seed_global.sql)
rm /tmp/staging.env
```

Variables set this way take precedence over a local root `.env`, so the command
cannot fall back to the Docker Compose database. `pg` prints a warning about
`sslmode=require` semantics changing in a future major version; it does not
affect the connection.

The `psql` line loads the synthetic seed dataset and needs a local `psql`
client. It runs in one transaction and can be re-run: rows that already exist
are skipped, and an existing ID with different content aborts the whole load
rather than overwriting it.

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
  open the dashboard or preview deployments; ask M1 for deployment changes.
