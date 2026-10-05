# Backend API Reference and Design Rationale

## Endpoint list

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/map` | Returns site location data for map rendering (GeoJSON) |
| `GET` | `/api/sites/{id}` | Returns full detail for a single site, for the site detail panel |
| `GET` | `/api/register` | Returns a page of the equipment register: searchable, filterable, sortable (FR-36) |
| `GET` | `/api/register/export` | Downloads every matching register row as CSV (FR-37) |
| `GET` | `/api/analytics/summary` | Returns total machines, sites and countries (FR-21) |
| `GET` | `/api/analytics/breakdowns` | Returns machine counts and shares by country, machine type, manufacturer, supplier and automation level (FR-23 to FR-26, FR-29, FR-31) |
| `GET` | `/api/analytics/timeline` | Returns machines newly commissioned and in service per year (FR-22, FR-30) |
| `GET` | `/api/reference-data` | Returns the controlled values for the contribution form |
| `POST` | `/api/contributions` | Submits a new deployment record with evidence (FR-40, FR-44) |
| `PATCH` | `/api/deployments/{id}` | Corrects an existing deployment record (FR-46 to FR-48) |
| `POST` | `/api/admin/session` | Signs an administrator in (FR-45) |
| `GET` | `/api/admin/session` | Returns the signed-in administrator |
| `DELETE` | `/api/admin/session` | Signs out |
| `POST` | `/api/admin/password` | Changes the signed-in administrator's password |
| `GET` | `/api/admin/reviews` | Lists records pending review (FR-45) |
| `GET` | `/api/admin/deployments/{id}` | Returns one record in any status, with evidence and history |
| `POST` | `/api/admin/deployments/{id}/reviews` | Records an approve, reject or needs-changes decision (FR-43) |
| `PATCH` | `/api/admin/deployments/{id}` | Administrator correction (FR-47) |
| `GET` | `/api/admin/users` | Lists administrator accounts (root only) |
| `POST` | `/api/admin/users` | Adds an administrator with a temporary password (root only) |
| `PATCH` | `/api/admin/users/{id}` | Deactivates or reactivates an administrator (root only) |

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
| `year` | `YYYY` | No | Only return deployments in service on 31 December of this year, counted as the analytics timeline counts them. Use either `date` or `year`, not both |
| `include_decommissioned` | `true`\|`false` | No | With `date` or `year`, also keep sites whose deployments had ended by then. Default `false` |
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
        "country_code": "AU",
        "region": "Pilbara",
        "commodity": "iron_ore",
        "status": "operational",
        "technology_suppliers": ["Caterpillar", "RCT"],
        "machine_count": 96,
        "deployment_count": 1
      }
    }
  ]
}
```

| Field | Description |
|---|---|
| `geometry.coordinates` | `[longitude, latitude]` |
| `excluded_count` | Number of deployments that cannot be placed in time (FR-19): with `date`, those without a commissioning date; with `year`, those without a commissioning year, other than announced ones |
| `properties.id`/`name` | Site identifier and name |
| `properties.country_code`/`region`/`commodity` | Site attributes, for headline counts and the site card without a request per site |
| `properties.status` | Highest-precedence deployment status for the site (FR-16). A site kept only by `include_decommissioned` reads `decommissioned` |
| `properties.technology_suppliers` | Array because a site may have multiple suppliers (FR-18) |
| `properties.machine_count`/`deployment_count` | Machines and deployments in view: every matching verified deployment, or only those in service on the `date` or `year`. Ended deployments kept by `include_decommissioned` never count |

**`year` rule.** On 31 December of the year, a deployment is in service when it is not announced, its commissioning year (or the year of its commissioning date) is no later, and the day falls inside `valid_from`..`valid_to`. This is the rule `GET /api/analytics/timeline` uses, so the machine counts on the map add up to that year's `in_service`. Unlike `date`, it places records known only by their year.

Malformed `bbox`, `date`, `year` or `include_decommissioned` parameters return `400` rather than being silently ignored, as does giving both `date` and `year`. Sites without coordinates cannot be placed on the map and are omitted. Filtering runs in SQL, so `excluded_count` remains accurate.

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
      "commissioning_year": 2021,
      "valid_from": "2021-01-01",
      "valid_to": null
    }
  ]
}
```

`machine_model` may be `null`; the frontend should fall back to `machine_type`. `automation_level` uses the deployment's own value when present, otherwise the technology product's level, and may be `null`. `technology_supplier` is derived through the technology-product relationship. Latitude/longitude are `null` for sites without coordinates.

---

## Shared deployment filters

`GET /api/register`, `GET /api/register/export` and the `GET /api/analytics/*` endpoints accept the same optional filters, so every analytics measure applies them (FR-27). Blank values are ignored; a parameter supplied more than once returns `400`.

| Parameter | Matches |
|---|---|
| `q` | Case-insensitive text search across site, machine model, manufacturer, supplier and product |
| `site_id` | One exact site, by its id (a positive whole number; anything else returns `400`). Used by the map's link to a site's register rows |
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

## `GET /api/analytics/breakdowns`

Accepts the shared filters and returns machine counts over matching verified deployments, grouped five ways:

```json
{
  "machine_count": 121,
  "by_country": [{ "key": "AU", "machine_count": 121, "share": 1 }],
  "by_machine_type": [{ "key": "haul_truck", "machine_count": 116, "share": 0.9587 }, { "key": "drill", "machine_count": 5, "share": 0.0413 }],
  "by_manufacturer": [{ "key": "Caterpillar", "machine_count": 116, "share": 0.9587 }, { "key": "Sandvik", "machine_count": 5, "share": 0.0413 }],
  "by_supplier": [{ "key": "Caterpillar", "machine_count": 116, "share": 0.9587 }, { "key": "RCT", "machine_count": 5, "share": 0.0413 }],
  "by_automation_level": [
    { "key": "operator_assistance", "machine_count": 0, "share": 0 },
    { "key": "teleremote", "machine_count": 5, "share": 0.0413 },
    { "key": "semi_autonomous", "machine_count": 0, "share": 0 },
    { "key": "autonomous", "machine_count": 96, "share": 0.7934 },
    { "key": null, "machine_count": 20, "share": 0.1653 }
  ]
}
```

- Like `GET /api/analytics/summary`, breakdowns count every verified deployment whatever its status, including announced and decommissioned ones. Pass `status=operational` for the current operating fleet, which matches the map's default view.
- `share` is the group's `machine_count` divided by the filtered `machine_count` (unrounded; shares above are rounded for display). It is `0` when nothing matches.
- `by_country`, `by_machine_type`, `by_manufacturer` and `by_supplier` list groups with machines, largest first and ties by name. With `machine_type` set, `by_manufacturer` and `by_supplier` rank the companies active in that type (FR-31); with `country` set, `by_automation_level` is that country's breakdown (FR-29).
- `by_automation_level` always lists the four levels in order, then `key: null` for machines whose level is unknown on both the deployment and its technology product. Unclassified machines are never assigned to a known level.
- Repeated filter parameters return `400`.

---

## `GET /api/analytics/timeline`

Accepts the shared filters and returns one row per year, from the first commissioning year among matching deployments to the current year:

```json
{
  "excluded_count": 1,
  "excluded_machine_count": 5,
  "years": [
    { "year": 2015, "newly_commissioned": 20, "in_service": 20 },
    { "year": 2021, "newly_commissioned": 96, "in_service": 96 }
  ]
}
```

- The series ends at the current year; deployments dated later are not counted yet.
- `announced` deployments are not commissioned yet, so they are left out of both measures and of the excluded counts. Use `GET /api/analytics/summary?status=announced` for their total.
- `newly_commissioned` (FR-30) sums `quantity` for deployments commissioned that year.
- `in_service` (FR-22) sums `quantity` for deployments commissioned in or before that year whose validity window contains 31 December of that year: `valid_from` empty or on or before it, and `valid_to` empty or on or after it. This is the same inclusive rule as the map's date filter, so a relocated record counts only from its own `valid_from`.
- The commissioning year comes from `commissioning_year`, so year-only records are placed without inventing a date.
- Other deployments with neither a commissioning date nor a year are left out and counted in `excluded_count` and `excluded_machine_count`, as the map reports `excluded_count` (FR-19). `years` is empty when no matching deployment is dated.
- Repeated filter parameters return `400`.

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

## Moderation

All moderation routes need a signed-in administrator whose temporary password
has been changed (see [Administrator sign-in](#administrator-sign-in)).

### `GET /api/admin/reviews`

`200 {"items": [...]}`: every deployment with `verification_status =
pending_review`, least recently changed first. Each item has `id`, `site_name`,
`country_code`, `region`, `machine_manufacturer`, `machine_model`,
`machine_type`, `quantity`, `technology_supplier`, `technology_product`,
`evidence_count` and `submitted_at` (when the record last changed).

### `GET /api/admin/deployments/{id}`

`200` with the record in any verification status: `verification_status`, site,
machine, technology, deployment fields (as in the register, plus `valid_from`,
`valid_to`, `created_at`, `updated_at`), and:

- `evidence`: `url`, `source_type`, `publisher`, `published_date`;
- `reviews`: `decision`, `note`, `administrator` (email), `reviewed_at`;
- `revisions`: `action` (`create`, `update`, `verification_change`),
  `previous_values`, `change_note`, `contributor_email`,
  `contributor_organisation`, `administrator`, `changed_at`.

`404` for an unknown or malformed id.

### `POST /api/admin/deployments/{id}/reviews`

Request: `{"decision": "approved" | "rejected" | "needs_changes", "note": "…"}`.
The note (up to 2,000 characters) is required unless approving.

| Decision | New `verification_status` |
|---|---|
| `approved` | `verified` |
| `rejected` | `rejected` |
| `needs_changes` | `unverified`; the record leaves the queue until a correction returns it to `pending_review` |

The review row, the new status and a `verification_change` revision holding the
previous status are written in one transaction.

| Status | Body |
|---|---|
| `201` | `{"id": <review id>, "verification_status": "verified"}` |
| `400` | `{"error": "invalid review", "fields": {...}}` |
| `404` | `{"error": "deployment not found"}` |
| `409` | `{"error": "only records pending review can be decided", "verification_status": "…"}` |
| `409` | `{"error": "a technology product is required before the record can be verified"}` |
| `409` | `{"error": "at least one evidence URL is required before the record can be verified"}` |

### `PATCH /api/admin/deployments/{id}`

Takes the fields of the public correction (`quantity`, `environment`,
`deployment_status`, `automation_level`, `installation_type`,
`commissioning_date`, `evidence_urls`, `change_note`) plus
`technology_supplier` and `technology_product`, which must be given together.
There are no contributor fields and no disclosure. The previous values are kept
in an `update` revision attributed to the administrator, and the verification
status does not change. Responses match the public correction: `200 {"id",
"verification_status"}`, `400` for invalid input or a correction that changes
nothing, `404` for an unknown record.

## Administrator accounts (root only)

These routes need a signed-in root administrator; any other administrator gets
`403 {"error": "root administrator required"}`. They never create, change or
deactivate root accounts, which are managed only with
`npm run admin:create -- --root`.

### `GET /api/admin/users`

`200 {"items": [...]}`, root accounts first, each with `id`, `email`, `role`,
`active`, `must_change_password` and `created_at`. Password hashes are never
returned.

### `POST /api/admin/users`

Request: `{"email": "reviewer@example.com"}`. Any `role` in the body is ignored.
`201 {"id", "email", "role": "admin", "temporary_password"}`: the temporary
password is returned only in this response and must be changed at first
sign-in. `400` for a missing or invalid email, `409` if the email is taken.

### `PATCH /api/admin/users/{id}`

Request: `{"active": false}` or `{"active": true}`. Deactivating ends the
account's sessions at once; accounts are never deleted, because review history
refers to them. `200 {"id", "active"}`, `400` for an invalid body, `404` for an
unknown account, `409` for a root account.

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
- Analytics count verified deployments only; there is no option to include unverified records.
- The frontend Analytics page still builds its figures from site detail requests; switching it to `/api/analytics/*` is the frontend part of #67.
- New submissions start as `pending_review`, and public corrections return records to review under FR-48; #62 still needs to confirm the final moderation behaviour and FR-51 anti-spam controls matter before public launch.
- Administrator revision/review history endpoints belong to #66.
- Persistence currently uses the shared parameterised `query()`/`withTransaction()` layer and is planned to move to Drizzle with #71.
