# Autonomous Mining Equipment Market Map

## Group Members

| Student ID | Name         |
| ---------- | ------------ |
| 24661999   | Hans Lionar  |
| 24389925   | Zerun Zhang  |
| 24814799   | Tyrone Tran  |
| 24758673   | Zunhao Zhang |
| 24368932   | Shee Wang    |
| 24201874   | Hengan Weng  |

## Description

Western Australia is a global leader in the adoption of autonomous mining technologies. However, there is no centralized, publicly accessible, and verifiable repository tracking autonomous mining equipment globally. This project is to build a web-based, crowdsourced, and queryable geospatial database designed to catalog every autonomous mining machine ever deployed. The objective of this project is to develop a robust Full-Stack Web Application that provides: A queryable database of global autonomous mining assets. A verified crowdsourcing mechanism allowing industry professionals to submit new kit data. An interactive GIS Map layer demonstrating geographical asset distribution. A Data Analytics Dashboard visualizing automation adoption trends across the industry. Example of data to include: Equipment Instance: Specific machine information including Type (Truck, Dozer, Loader, Drill), Manufacturer (CAT, Komatsu, Liebherr), Model, and machine-specific metadata (e.g., Max Payload, Operating Weight). Technology & Timeline: Tracking the technology provider/integrator (e.g., RCT, ASI, CAT) and the specific deployment/commissioning date. Geographic Grouping (Mine Sites): Equipment must support multi-layered grouping (e.g., individual autonomous trucks grouped under "Mine Site X", which is grouped under "Pilbara Region Operations", owned by "Company Y"). Verification Layer: To prevent misinformation, equipment must link to evidence (e.g., a URL to a press release, news story, or academic paper) to gain a 'verification' mark. Case Studies & Media: Allow users to upload or link case studies and cross-reference them with specific companies, sites, or equipment types. Technology stack is entirely up to the team to choose, but should support being deployed in a UWA IT environment as far as practical.

- **IP**: Creative Commons (open source)
- **Client**: Adrian Boeing
- **Location**: UWA EECE

## Local development

### Requirements

- Docker Desktop, or Docker Engine with Docker Compose
- On Apple Silicon, Docker must allow `linux/amd64` emulation for the official
  PostGIS image

### Start the backend and database

```sh
cp .env.example .env
docker compose up --build -d
docker compose exec backend npm run db:migrate
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X' < backend/seeds/seed_global.sql
```

The migration command upgrades both fresh and existing databases. The seed
command loads the deterministic synthetic demonstration dataset and is safe to
repeat. After the first image build, `docker compose up -d` is sufficient.
The services are available at:

- Backend API: `http://localhost:3000`
- PostgreSQL/PostGIS: `localhost:5432`

Confirm that the backend can reach PostgreSQL and that PostGIS is enabled:

```sh
curl --fail http://localhost:3000/health/database
```

The response includes both the PostgreSQL and PostGIS versions. Stop the stack
with `docker compose down`. The named database volume is retained between
starts; `docker compose down --volumes` also deletes all local database data.

### Start the frontend

In a second terminal:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. The checked-in
frontend environment example sends `/api` requests to the backend at
`http://localhost:3000` through the development proxy.

### Environment variables

Copy [`.env.example`](.env.example) to `.env` before starting the stack. The
example values are for local development only; `.env` is ignored by Git and
must never be committed.

| Variable | Purpose |
|---|---|
| `POSTGRES_DB` | Local database name |
| `POSTGRES_USER` | Local database user |
| `POSTGRES_PASSWORD` | Local-only database password |
| `POSTGRES_PORT` | Database port exposed on the host |
| `BACKEND_PORT` | Backend port exposed on the host |
| `DATABASE_URL` | Backend connection string when running outside Compose |
| `POSTGIS_PLATFORM` | Docker image platform; defaults to `linux/amd64` |

Inside Docker Compose, the backend connection string is overridden to use
`db`—the Compose database service name—as its host. This keeps the checked-in
example useful for running the backend directly while preserving container
networking.

## Staging

The integrated build runs at <https://capstone-group-5.vercel.app>, with the
API at <https://capstone-group-5-api.vercel.app>. See
[`docs/staging.md`](docs/staging.md) for its architecture, environment
variables, deployment, migrations and rollback.
