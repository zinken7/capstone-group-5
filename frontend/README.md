# Frontend

React and TypeScript frontend for the Autonomous Mining Equipment Market Map.

## Requirements

- Node.js 22
- npm

## Getting started

```sh
npm ci
cp .env.example .env
npm run dev
```

Vite will print the local development URL in the terminal.

## API environment configuration

- `VITE_API_BASE_URL` is the browser-facing API base URL, including the API
  prefix. It defaults to `/api` when unset or blank.
- `API_PROXY_TARGET` is the backend origin used by the Vite development proxy.
  It defaults to `http://localhost:3000` and is not exposed to browser code.

Locally, keep `VITE_API_BASE_URL=/api`. Browser requests such as `/api/map` and
`/api/sites/1` go to the Vite origin; Vite forwards them to the proxy target
with the `/api` path intact. This needs no backend CORS middleware. To use a
different development backend, change `API_PROXY_TARGET` in `.env` and restart
Vite.

Staging also keeps the default `/api`: `frontend/vercel.json` rewrites `/api/*`
to the backend's Vercel project, so the browser sees one origin and needs no
CORS (see [`docs/staging.md`](../docs/staging.md)). Vite embeds
`VITE_API_BASE_URL` at build time, so rebuild after changing it. An absolute API
URL on another origin would need that API to allow the frontend origin through
CORS, which the Express backend does not configure.

Never put secrets in frontend environment variables. All `VITE_*` values are
browser-visible. The example file contains only non-secret URLs.

## Available scripts

- `npm run dev` starts the development server.
- `npm test` runs the Vitest unit and component tests in jsdom with mocked
  fetch; no running backend or browser is required.
- `npm run test:e2e` runs the Playwright end-to-end and axe accessibility
  checks in `e2e/`. Install the browser once with `npx playwright install
  chromium`. Playwright starts the Vite server itself, and pages that load data
  need the backend running. CI does not run them.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` checks TypeScript without producing build output.
- `npm run preview` serves the production build locally.

## Source structure

The frontend uses feature-based organization. Routes are declared in
`App.tsx`.

```text
src/
├── features/       # Code owned by a single product feature
│   ├── map/        # Map page (/map)
│   ├── equipment/  # Equipment register and its Correct dialog (/equipment)
│   ├── analytics/  # Analytics page (/analytics)
│   ├── contribute/ # Contribution form and My contributions (/contribute)
│   ├── admin/      # Administration pages (/admin/*) and the session
│   └── not-found/  # The 404 page
├── layouts/        # The public header, footer and administrator strip
├── lib/            # Shared HTTP client, API functions and formatting
├── shared/         # Components used by several features
├── styles/         # Global styles and design tokens
├── test/           # Test setup and the fetch stub
├── App.tsx
└── main.tsx
```

Some folders hold only a `.gitkeep` from the original scaffold. Keep
feature-specific components, hooks, and presentation types inside their feature.
All transport and endpoint functions belong in the single shared `src/lib/api/`
boundary; later register, export and analytics clients should extend it.

The analytics page uses [Recharts](https://recharts.org/) for the area, bar and
donut visualisations. It keeps chart rendering declarative and composable with
React, while the page also provides accessible table views for users who need
the exact values or cannot use the visual charts.

Import `getMap`, `getSite`, `ApiError` and their types from `src/lib/api/index.ts`.
`getMap(query?)` returns `MapResult` containing marker summaries and an
`excludedCount`; it preserves the backend-derived marker status. Its optional
filters are `bbox` (`[minLon, minLat, maxLon, maxLat]`), `supplier`, `date`
(`YYYY-MM-DD`), `country`, `region`, `machineType`, `automationLevel`, `commodity`
and `environment`. Query serialization and DTO-to-camelCase mapping happen
inside the boundary. `getSite(id)` returns `SiteDetail` with deployments and
preserves nullable fields. The map page uses these live endpoints.

The generic `requestJson<T>(path, options?)` uses native fetch and resolves paths
relative to the configured API base. It supports standard `RequestInit` options;
callers sending JSON should stringify the body and set `Content-Type`.
HTTP failures, network failures and unreadable JSON responses throw `ApiError`.
Its `status` is available when an HTTP response was received; network failures
have no status. DTO types describe the documented contract without runtime
schema validation.

Tests should live next to the code they cover, for example
`EquipmentCard.test.tsx` beside `EquipmentCard.tsx`.
