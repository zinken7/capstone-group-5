# Autonomous Mining Equipment Market Map — MVP

A runnable capstone MVP for a public, crowdsourced and verifiable registry of autonomous mining equipment.

## What is included

- **Queryable registry** with filters for equipment type, manufacturer, country and verification state.
- **Interactive GIS map** with GeoJSON endpoints, a PostGIS spatial index and native radius filtering.
- **Crowdsourcing form** requiring at least one public evidence URL.
- **Verification workflow** for approving or rejecting submissions using a protected admin endpoint.
- **Analytics dashboard** for asset totals, sites, countries, equipment mix, manufacturers and commissioning timeline.
- **Hierarchical locations**: region → operation → mine site.
- **Evidence and case-study model** linked to equipment, organisations and locations.
- **Docker Compose deployment** suitable for a UWA VM or other Docker host.
- **OpenAPI documentation** at `/docs` and automated API tests.

The included records are deliberately **synthetic demo data**, not factual mining deployment claims.

## Architecture

```text
Browser
  ├─ Server-rendered HTML + vanilla JavaScript
  ├─ Leaflet / OpenStreetMap map
  └─ Chart.js analytics
          │
          ▼
FastAPI application
  ├─ Public query API
  ├─ Submission API
  ├─ Moderation API
  └─ SQLAlchemy data access
          │
          ▼
PostgreSQL + PostGIS
```

This single-service web architecture is intentionally practical for a student team: fewer moving parts than a separate SPA and API, while retaining a clean API boundary that allows a Nuxt/React frontend later.

## Run with Docker

```bash
cp .env.example .env
# Change ADMIN_API_KEY and SECRET_KEY in .env
docker compose up --build
```

Open:

- App: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Admin moderation: `http://localhost:8000/admin`

Stop:

```bash
docker compose down
```

Delete all local database data:

```bash
docker compose down -v
```

## Run without Docker for development

The application falls back to SQLite when `DATABASE_URL` is not set. This is useful for quick local testing, but PostgreSQL/PostGIS should be used for the deployed version.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Change DATABASE_URL in .env to: sqlite:///./mining.sqlite3
uvicorn app.main:app --reload
```

## Run tests

```bash
pytest
```

## Core API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/equipment` | Search and filter equipment |
| GET | `/api/equipment/{id}` | Equipment, evidence and hierarchy detail |
| GET | `/api/map` | GeoJSON map data |
| GET | `/api/analytics` | Dashboard aggregates |
| POST | `/api/submissions` | Submit new equipment with evidence |
| GET | `/api/admin/submissions` | Get moderation queue |
| POST | `/api/admin/submissions/{id}/approve` | Verify a submission |
| POST | `/api/admin/submissions/{id}/reject` | Reject a submission |

Admin routes require an `X-Admin-Key` header matching `ADMIN_API_KEY`.

## MVP acceptance criteria

1. A visitor can view verified equipment on a global map.
2. A visitor can query the registry using at least four useful filters.
3. A contributor can submit a new deployment only when evidence is provided.
4. A new record is hidden from the public registry until approved.
5. An administrator can inspect evidence and approve or reject a record.
6. Approved data immediately appears in the registry, map and analytics.
7. Location records support region, operation and mine-site grouping.
8. The application can be launched from a clean machine with Docker Compose.
9. Automated tests cover health, validation, moderation and publication flow.

## Recommended next increments after the client meeting

- Replace API-key moderation with UWA SSO or role-based accounts.
- Add duplicate detection and source-domain trust scoring.
- Add file uploads through UWA-approved object storage.
- Add change history and reviewer identity for auditable verification.
- Add mine polygons, bounding-box queries and marker clustering at larger scale.
- Add CSV import/export and a data dictionary agreed with the client.
- Add evidence archiving or link-health checks.

## Supporting documents

- `docs/ARCHITECTURE.md` — components, trust workflow and deployment boundary
- `docs/DATA_DICTIONARY.md` — entities and modelling decisions
- `docs/CLIENT_ASSUMPTIONS.md` — assumptions to validate in the first meeting
- `docs/DEMO_SCRIPT.md` — five-minute assessment demo

## Important deployment notes

- Set strong production secrets and disable demo seeding after initial setup.
- Put the service behind HTTPS and a UWA-managed reverse proxy.
- Restrict the database port so it is not internet-accessible.
- Add backups before storing non-demo data.
- Confirm privacy, acceptable-use and copyright requirements before accepting uploads.
