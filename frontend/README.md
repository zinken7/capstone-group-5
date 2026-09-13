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

For staging, set `VITE_API_BASE_URL` in the build environment, for example:

```sh
VITE_API_BASE_URL=https://staging.example.com/api npm run build
```

Vite embeds this value at build time, so rebuild when changing it. A deployed
frontend using `/api` needs its host/reverse proxy to route `/api` to the backend;
the Vite development proxy does not configure production routing. An absolute
API URL on a different origin requires that API to allow the frontend origin
through CORS; the current Express backend does not configure CORS.

Never put secrets in frontend environment variables. All `VITE_*` values are
browser-visible. The example file contains only non-secret URLs.

## Available scripts

- `npm run dev` starts the development server.
- `npm test` runs the API-layer Vitest tests in Node with mocked fetch; no running
  backend or browser environment is required.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` checks TypeScript without producing build output.
- `npm run preview` serves the production build locally.

## Source structure

The frontend uses feature-based organization. Planned directories are tracked
with `.gitkeep` so every team member starts from the same structure. Remove a
directory's `.gitkeep` after adding its first real file.

```text
src/
├── app/            # Application-wide router and providers
├── assets/         # Images, icons, and other static imports
├── components/ui/  # Reusable, domain-agnostic UI components
├── features/       # Code owned by a single product feature
├── layouts/        # Shared page layouts
├── lib/api/        # Shared HTTP client and API configuration
├── styles/         # Global styles and design tokens
├── types/          # Types shared across multiple features
├── App.tsx
└── main.tsx
```

Feature boundaries are `equipment`, `map`, `dashboard`, and `submissions`. Keep
feature-specific components, hooks, and presentation types inside their feature.
All transport and endpoint functions belong in the single shared `src/lib/api/`
boundary; later register, export and analytics clients should extend it.

Import `getMap`, `getSite`, `ApiError` and their types from `src/lib/api/index.ts`.
`getMap(query?)` returns `MapResult` containing marker summaries and an
`excludedCount`; it preserves the backend-derived marker status. Its optional
filters are `bbox` (`[minLon, minLat, maxLon, maxLat]`), `supplier`, `date`
(`YYYY-MM-DD`), `country`, `region`, `machineType`, `automationLevel`, `commodity`
and `environment`. Query serialization and DTO-to-camelCase mapping happen
inside the boundary. `getSite(id)` returns `SiteDetail` with deployments and
preserves nullable fields. Marker summaries are separate from the fixture UI's
`MapSite` model. Live map integration remains in issue #41.

The generic `requestJson<T>(path, options?)` uses native fetch and resolves paths
relative to the configured API base. It supports standard `RequestInit` options;
callers sending JSON should stringify the body and set `Content-Type`.
HTTP failures, network failures and unreadable JSON responses throw `ApiError`.
Its `status` is available when an HTTP response was received; network failures
have no status. DTO types describe the documented contract without runtime
schema validation.

Tests should live next to the code they cover, for example
`EquipmentCard.test.tsx` beside `EquipmentCard.tsx`.
