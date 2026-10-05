# Backend API Reference and Design Rationale

## Endpoint list

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/map` | Returns site location data for map rendering (GeoJSON) |
| `GET` | `/api/sites/{id}` | Returns full detail for a single site, for the site detail panel |
| `GET` | `/api/register` | Returns a page of the equipment register: searchable, filterable, sortable (FR-36) |
| `GET` | `/api/register/export` | Downloads every matching register row as CSV (FR-37) |
| `GET` | `/api/analytics/summary` | Returns total machines, sites and countries (FR-21) |
| `GET` | `/api/reference-data` | Returns the controlled values for the contribution form |
| `POST` | `/api/contributions` | Submits a new deployment record with evidence (FR-40, FR-44) |
| `PATCH` | `/api/deployments/{id}` | Corrects an existing deployment record (FR-46 to FR-48) |
| `POST` | `/api/admin/session` | Signs an administrator in (FR-45) |
| `GET` | `/api/admin/session` | Returns the signed-in administrator |
| `DELETE` | `/api/admin/session` | Signs out |
| `POST` | `/api/admin/password` | Changes the signed-in administrator's password |

The public read endpoints only return deployments with `verification_status = verified` by default (FR-43).

## Design principle: contract first

Fields and enum values are aligned with the controlled-values table in `docs/database/ERD.md`; functional behaviour is aligned with section 4.2 of `docs/SRS/SRS.md`. Database access uses parameterised queries (NFR-05).

---

## `GET /api/map`

### Request parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `bbox` | `minLon,minLat,maxLon,maxLat` | No | Restrict to sites within the given rectangular range |
| `supplier` | string | No | Filter by technology supplier |
| `date` | `YYYY-MM-DD` | No | Only return deployments still in service on this date |
| `country` | string | No | Filter by country code |
| `region` | string | No | Filter by region |
| `machine_type` | string | No | Filter by machine type |
| `automation_level` | string | No | Filter by automation level |
| `commodity` | string | No | Filter by commodity |
| `environment` | `surface`\|`underground`\|`both` | No | Filter by surface/underground environment |

### Response — `200 OK`

```json
{
  "type": "FeatureCollection",
  "excluded_count": 3,
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [118.7, -22.3] },
      "properties": {
        "id": 1,
        "name": "Roy Hill",
        "status": "operational",
        "technology_suppliers": ["Caterpillar", "RCT"]
      }
    }
  ]
}
```

| Field | Description |
|---|---|
| `geometry.coordinates` | `[longitude, latitude]` |
| `excluded_count` | Number of deployments excluded by the date filter (FR-19) |
| `properties.id`/`name` | Site identifier and name |
| `properties.status` | Highest-precedence deployment status for the site (FR-16) |
| `properties.technology_suppliers` | Array because a site may have multiple suppliers (FR-18) |

Malformed `bbox` or `date` parameters return `400` rather than being silently ignored. Sites without coordinates cannot be placed on the map and are omitted. Filtering runs in SQL and `date` is handled so `excluded_count` remains accurate.

---

## `GET /api/sites/{id}`

Returns one site's base attributes and its verified deployments. An unknown id returns `404 {"error":"site not found"}`.

```json
{
  "id": 1,
  "name": "Roy Hill",
  "country_code": "AU",
  "region": "Pilbara",
  "commodity": "iron_ore",
  "mine_status": "operating",
  "latitude": -22.3,
  "longitude": 118.7,
  "deployments": [
    {
      "id": 10,
      "machine_manufacturer": "Caterpillar",
      "machine_model": "Caterpillar 793F",
      "machine_type": "haul_truck",
      "quantity": 96,
      "technology_supplier": "Caterpillar",
      "automation_level": "autonomous",
      "environment": "surface",
      "status": "operational",
      "commissioning_date": "2021-01-01",
      "valid_from": "2021-01-01",
      "valid_to": null
    }
  ]
}
```

`machine_model` may be `null`; the frontend should fall back to `machine_type`. `automation_level` uses the deployment's own value when present, otherwise the technology product's level, and may be `null`. `technology_supplier` is derived through the technology-product relationship. Latitude/longitude are `null` for sites without coordinates.

---

## Shared deployment filters

`GET /api/register`, `GET /api/register/export` and `GET /api/analytics/summary` accept the same optional filters. Blank values are ignored; a parameter supplied more than once returns `400`.

| Parameter | Matches |
|---|---|
| `q` | Case-insensitive text search across site, machine model, manufacturer, supplier and product |
| `country` | Site country code |
| `region` | Region name |
| `commodity` | Site commodity |
| `supplier` | Technology supplier name |
| `manufacturer` | Machine manufacturer name |
| `machine_type` | Machine type enum value |
| `automation_level` | Deployment level, falling back to the product level |
| `environment` | `surface`, `underground` or `both` |
| `status` | `announced`, `commissioning`, `operational` or `decommissioned` |

An enum value outside the controlled list matches nothing rather than raising a database error.

---

## `GET /api/register`

Accepts the shared filters plus:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sort` | `site`\|`country`\|`manufacturer`\|`machine_type`\|`supplier`\|`status`\|`quantity`\|`commissioning` | `site` | Sort column |
| `order` | `asc`\|`desc` | `asc` | Sort direction; missing values sort last and ties break on `id` |
| `limit` | integer 1–500 | `50` | Page size |
| `offset` | integer ≥ 0 | `0` | Rows to skip |

### Response — `200 OK`

```json
{
  "total": 3,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": 10,
      "site_id": 1,
      "site_name": "Roy Hill",
      "country_code": "AU",
      "region": "Pilbara",
      "commodity": "iron_ore",
      "machine_manufacturer": "Caterpillar",
      "machine_model": "Caterpillar 793F",
      "model_variant": null,
      "machine_type": "haul_truck",
      "quantity": 96,
      "technology_supplier": "Caterpillar",
      "technology_product": "Cat MineStar Command for hauling",
      "automation_level": "autonomous",
      "environment": "surface",
      "installation_type": "unknown",
      "status": "operational",
      "commissioning_date": "2021-01-01",
      "commissioning_year": 2021,
      "valid_from": "2021-01-01",
      "valid_to": null
    }
  ]
}
```

`model_variant` is `null` when unknown or not supplied; `base` is used only when explicitly identified. `commissioning_year` supports year-only precision. Invalid sort/paging parameters or repeated filters return `400`.

---

## `GET /api/register/export`

Accepts the shared filters, `sort` and `order`. `limit` and `offset` are ignored so every matching row is exported. The response is `text/csv; charset=utf-8` with filename `autonomous-mining-equipment.csv`.

The column order matches `GET /api/register`. CSV uses RFC 4180 quoting with CRLF line endings; `null` is an empty cell. Text beginning with `=`, `+`, `-`, `@`, tab or carriage return is prefixed with `'` to prevent spreadsheet formula execution.

---

## `GET /api/analytics/summary`

Accepts the shared filters and returns headline totals over matching verified deployments:

```json
{ "machine_count": 121, "site_count": 2, "country_count": 1 }
```

`machine_count` is the sum of `quantity`; `site_count` and `country_count` are distinct counts. Repeated filter parameters return `400`.

---

## `GET /api/reference-data`

Returns the controlled values accepted by the contribution and correction endpoints. A backend test compares them with `pg_enum` so the API cannot silently drift from migration 002.

```json
{
  "machine_types": ["haul_truck", "lhd", "loader", "dozer", "excavator", "drill", "scaler", "shotcrete_machine", "underground_haul_truck", "water_truck", "wheel_loader", "crawler_loader", "rock_breaker", "skid_steer", "strut_handler", "shovel", "other"],
  "automation_levels": ["operator_assistance", "teleremote", "semi_autonomous", "autonomous"],
  "environments": ["surface", "underground", "both"],
  "deployment_statuses": ["announced", "commissioning", "operational", "decommissioned"],
  "installation_types": ["factory_installed", "retrofit", "unknown"]
}
```

---

## `POST /api/contributions`

Submits one deployment record. No account is required.

### Request body (JSON)

| Field | Type | Required | Rule |
|---|---|---|---|
| `site_name` | string | Yes | ≤ 200 characters |
| `country_code` | string | Yes | Two letters; stored upper-case |
| `region` | string | No | ≤ 100 characters |
| `commodity` | string | No | ≤ 100 characters |
| `machine_type` | string | Yes | One of `machine_types` |
| `machine_manufacturer` | string | Yes | ≤ 200 characters |
| `machine_model` | string | No | ≤ 200 characters |
| `machine_model_variant` | string or null | No | ≤ 100 characters; omitted, null or blank becomes `null`. Explicit `base` remains distinct; comparison is case-insensitive |
| `quantity` | number | Yes | Whole number 1–100000 |
| `environment` | string | No | One of `environments` |
| `deployment_status` | string | No | One of `deployment_statuses` |
| `automation_level` | string | No | One of `automation_levels`; stored even without a product |
| `installation_type` | string | No | One of `installation_types`; defaults to `unknown` |
| `technology_supplier` | string | No | ≤ 200 characters |
| `technology_product` | string | No | ≤ 200 characters; requires `technology_supplier` |
| `commissioning_date` | string | No | `YYYY` or a real `YYYY-MM-DD` date |
| `evidence_urls` | string[] | No | Up to 10 `http`/`https` URLs; blanks and duplicates are dropped |
| `contributor_email` | string | No | Valid email address |
| `organisation` | string | No | ≤ 200 characters |
| `disclosure_accepted` | boolean | Yes | Must be `true` (FR-41) |

`null` or a blank string counts as not supplied. Unknown fields are ignored.

### Response — `201 Created`

```json
{ "id": 42, "verification_status": "pending_review" }
```

The record stays out of public map, site detail, register and analytics responses until an administrator verifies it.

### Errors

- Invalid fields: `400 {"error":"invalid contribution","fields":{...}}` with all invalid fields listed.
- Malformed JSON: `400 {"error":"invalid JSON body"}`.
- Oversized JSON: `413 {"error":"request body too large"}`; request limit is 100 kB.

### Behaviour

- All writes occur in one transaction; any failure rolls everything back.
- Companies, regions, sites, machine models and technology products are reused case-insensitively when they match; otherwise they are created.
- A supplier without a product does not create a placeholder product.
- `commissioning_date: "YYYY"` stores only `commissioning_year`; a full date stores both and sets `valid_from`.
- A contributor row is created only when email or organisation is supplied.
- A `create` revision stores the submission snapshot without contact details.

---

## `PATCH /api/deployments/{id}`

Corrects an existing deployment. Site, company and model details remain administrator-managed.

| Field | Rule |
|---|---|
| `quantity`, `environment`, `deployment_status`, `automation_level`, `installation_type`, `commissioning_date` | Same rules as contribution submission; omitted or `null` leaves the value unchanged |
| `evidence_urls` | URLs to add; existing ones are ignored |
| `contributor_email`, `organisation` | Optional contact details |
| `change_note` | Optional, ≤ 1000 characters |
| `disclosure_accepted` | Must be `true` |

At least one correctable field or evidence URL must be supplied.

### Response — `200 OK`

```json
{ "id": 10, "verification_status": "pending_review" }
```

Invalid corrections return `400`, a no-op returns `400 {"error":"correction does not change the record"}`, and an unknown id returns `404`.

The deployment row is locked for the transaction. An `update` revision stores each previous changed value, the previous verification status and, when evidence is added, the previous evidence list. The record returns to `pending_review` (FR-48) and is hidden from public read endpoints until reviewed again.

---

## Administrator sign-in

Administrator routes live under `/api/admin`. A session is a signed,
`HttpOnly`, `SameSite=Strict` cookie named `admin_session`, scoped to the path
`/api/admin` and valid for 8 hours. It is `Secure` except when `NODE_ENV` is
`development` or `test`. The account is reloaded on every request, so
deactivating it or changing its password ends its sessions at once.

Every modifying request (`POST`, `PATCH`, `DELETE`) must send the header
`X-Requested-With: fetch`, otherwise it gets `403`. Requests without a valid
session get `401 {"error": "sign in required"}`. An account that still has its
temporary password gets `403 {"error": "password change required"}` from every
administrator route except `GET /api/admin/session` and `POST /api/admin/password`.
If `SESSION_SECRET` is not configured, administrator routes return `503`.

### `POST /api/admin/session`

Request: `{"email": "reviewer@example.com", "password": "…"}`. The email is
case-insensitive.

| Status | Body |
|---|---|
| `200` | `{"email": "reviewer@example.com", "role": "admin", "must_change_password": true}`, and the session cookie |
| `400` | `{"error": "email and password are required"}` |
| `401` | `{"error": "incorrect email or password"}`, the same for an unknown email, a wrong password and a deactivated account |

### `GET /api/admin/session`

`200` with the same body as sign-in, or `401`.

### `DELETE /api/admin/session`

`204`, and the cookie is cleared.

### `POST /api/admin/password`

Request: `{"current_password": "…", "new_password": "…"}`. The new password
needs at least 12 characters and must differ from the current one. On success
the response is `200` with the profile (`must_change_password: false`) and a new
session cookie; other sessions of the account end. Errors are `400` with one
of: `current password is incorrect`, `new password must be at least 12
characters`, `new password must differ from the current password`,
`current_password and new_password are required`.

## Common implementation trade-offs

- Internal TypeScript/repository fields use camelCase; API responses use snake_case.
- Test fixtures deliberately include an unverified deployment so FR-43 filtering is exercised.
- Filtering runs in SQL with parameterised values. Enum columns are compared as text so unknown filter values match nothing instead of raising a database error.
- Site status remains derived in `lib/site-status.ts` so the precedence rule has one implementation.

## Tests

Route tests, repository tests and contribution/correction service tests run against a real PostGIS database. Fixtures are seeded before each case. The suite uses a dedicated test database derived from `DATABASE_URL` (`<name>_test`), creates and migrates it automatically on first run, and `resetDatabase()` refuses a non-test database. Locally, start PostgreSQL with `docker compose up -d db`, then run `npm test` from `backend/`.

## Outstanding

- Sites without coordinates are omitted from `/api/map`; `/api/sites/{id}` returns `null` coordinates for them.
- `valid_from` may be null; the map date filter treats that as no lower bound.
- Moderation still needs visibility parameters such as `include_unverified`.
- Register and summary filters do not yet include the map's `date` and `bbox` parameters.
- Remaining analytics measures (FR-22 to FR-27 breakdowns) are tracked in #67.
- New submissions start as `pending_review`, and public corrections return records to review under FR-48; #62 still needs to confirm the final moderation behaviour and FR-51 anti-spam controls matter before public launch.
- Administrator revision/review history endpoints belong to #66.
- Persistence currently uses the shared parameterised `query()`/`withTransaction()` layer and is planned to move to Drizzle with #71.
