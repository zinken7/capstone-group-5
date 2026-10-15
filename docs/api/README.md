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
| `GET` | `/api/analytics/crosstab` | Returns machine counts for every pair of groups across two dimensions, for the analytics heatmap and mix charts |
| `GET` | `/api/reference-data` | Returns the controlled values for the contribution form |
| `POST` | `/api/contributions` | Submits a new deployment record with evidence (FR-40, FR-44) |
| `PATCH` | `/api/deployments/{id}` | Corrects an existing deployment record (FR-46 to FR-48) |
| `POST` | `/api/admin/session` | Signs an administrator in (FR-45) |
| `GET` | `/api/admin/session` | Returns the signed-in administrator |
| `DELETE` | `/api/admin/session` | Signs out |
| `POST` | `/api/admin/password` | Changes the signed-in administrator's password |
| `GET` | `/api/admin/reviews` | Lists records pending review (FR-45) |
| `GET` | `/api/admin/submissions` | Lists submission history with pagination and optional ID filtering |
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
| `year` | `YYYY` | No | Only return deployments in service on 31 December of this year, counted as the analytics timeline counts them except for commissioning deployments. Use either `date` or `year`, not both |
| `include_decommissioned` | `true`\|`false` | No | Without `date` or `year`, also count deployments currently marked decommissioned. With `date` or `year`, also keep sites whose deployments had ended by then (announced and commissioning deployments never count as ended). Default `false` |
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
| `excluded_count` | Number of deployments that cannot be placed in time (FR-19): with `date`, those without a commissioning date; with `year`, those without a commissioning year. Announced and commissioning deployments are never counted |
| `properties.id`/`name` | Site identifier and name |
| `properties.country_code`/`region`/`commodity` | Site attributes, for headline counts and the site card without a request per site |
| `properties.status` | Highest-precedence deployment status for the site (FR-16). A site kept only by `include_decommissioned` reads `decommissioned` |
| `properties.technology_suppliers` | Array because a site may have multiple suppliers (FR-18) |
| `properties.machine_count`/`deployment_count` | Machines and deployments in view (FR-16). Without `date` or `year`: matching verified deployments currently marked operational, plus decommissioned ones with `include_decommissioned`. With `date` or `year`: those in service on that day, whatever their current status. Announced and commissioning deployments never count, and ended deployments kept by `include_decommissioned` never count |

**`year` rule.** On 31 December of the year, a deployment is in service when it is neither announced nor commissioning, its commissioning year (or the year of its commissioning date) is no later, and the day falls inside `valid_from`..`valid_to`. A deployment decommissioned since then still counts for the years it was in service. `GET /api/analytics/timeline` uses the same rule but also counts commissioning deployments, so the machine counts on the map add up to that year's `in_service` less its commissioning machines. Unlike `date`, it places records known only by their year.

Malformed `bbox`, `date`, `year` or `include_decommissioned` parameters return `400` rather than being silently ignored, as does giving both `date` and `year`. Sites without coordinates cannot be placed on the map and are omitted. Filtering runs in SQL, so `excluded_count` remains accurate.

---

## `GET /api/sites/{id}`

Returns one site's base attributes and its verified deployments. An unknown id, or a site with no verified deployment yet (for example one created by a contribution still awaiting review), returns the same `404 {"error":"site not found"}`, so unpublished sites cannot be discovered by trying ids (FR-43).

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

`machine_model` may be `null` for imported records; the frontend should fall back to `machine_type`. `automation_level` is the deployment's own level, which every deployment carries (migration 005). `technology_supplier` is the deployment's supplier, named whether or not a technology product is. Latitude/longitude are `null` for sites without coordinates.

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
| `commissioned_from` | Commissioning year on or after this four-digit year, taken from `commissioning_year` or else the commissioning date. Undated deployments are left out; anything other than four digits returns `400` |
| `commissioned_to` | Commissioning year on or before this four-digit year, with the same rules |

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

The exported records are licensed under CC BY 4.0 (NFR-08); see [`LICENSE-DATA.md`](../../LICENSE-DATA.md).

---

## `GET /api/analytics/summary`

Accepts the shared filters and returns headline totals over matching verified deployments:

```json
{ "machine_count": 121, "site_count": 2, "country_count": 1 }
```

`machine_count` is the sum of `quantity`; `site_count` and `country_count` are distinct counts. Repeated filter parameters return `400`.

---

## `GET /api/analytics/breakdowns`

Accepts the shared filters and returns machine counts over matching verified deployments, grouped by country, region, machine type, manufacturer, supplier, automation level, deployment status and commodity:

```json
{
  "machine_count": 121,
  "by_country": [{ "key": "AU", "machine_count": 121, "share": 1 }],
  "by_machine_type": [{ "key": "haul_truck", "machine_count": 116, "share": 0.9587 }, { "key": "drill", "machine_count": 5, "share": 0.0413 }],
  "by_manufacturer": [{ "key": "Caterpillar", "machine_count": 116, "share": 0.9587 }, { "key": "Sandvik", "machine_count": 5, "share": 0.0413 }],
  "by_supplier": [{ "key": "Caterpillar", "machine_count": 116, "share": 0.9587 }, { "key": "RCT", "machine_count": 5, "share": 0.0413 }],
  "by_status": [{ "key": "operational", "machine_count": 116, "share": 0.9587 }, { "key": "decommissioned", "machine_count": 5, "share": 0.0413 }],
  "by_commodity": [{ "key": "iron_ore", "machine_count": 121, "share": 1 }],
  "by_region": [{ "key": "Pilbara", "machine_count": 121, "share": 1 }],
  "by_automation_level": [
    { "key": "operator_assistance", "machine_count": 20, "share": 0.1653 },
    { "key": "teleremote", "machine_count": 5, "share": 0.0413 },
    { "key": "semi_autonomous", "machine_count": 0, "share": 0 },
    { "key": "autonomous", "machine_count": 96, "share": 0.7934 },
    { "key": null, "machine_count": 0, "share": 0 }
  ]
}
```

- Like `GET /api/analytics/summary`, breakdowns count every verified deployment whatever its status, including announced and decommissioned ones. Pass `status=operational` for records currently marked operational. This is not the same set as the map's default view, which follows the validity window (`valid_from`..`valid_to`) for the year rather than the status field.
- `share` is the group's `machine_count` divided by the filtered `machine_count` (unrounded; shares above are rounded for display). It is `0` when nothing matches.
- `by_country`, `by_machine_type`, `by_manufacturer`, `by_supplier`, `by_status`, `by_commodity` and `by_region` list groups with machines, largest first and ties by name. With `machine_type` set, `by_manufacturer` and `by_supplier` rank the companies active in that type (FR-31); with `country` set, `by_automation_level` is that country's breakdown (FR-29).
- `by_automation_level` always lists the four levels in order, then `key: null` for unclassified machines. Since migration 005 every deployment carries its own level, so that group is `0`; it is kept so the response shape does not change.
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

## `GET /api/analytics/crosstab`

Accepts the shared filters plus two required parameters, `rows` and `columns`, and returns the machine count for every pair of groups that has machines:

```json
{
  "rows": "manufacturer",
  "columns": "machine_type",
  "machine_count": 121,
  "cells": [
    { "row": "Caterpillar", "column": "haul_truck", "machine_count": 116 },
    { "row": "Sandvik", "column": "drill", "machine_count": 5 }
  ]
}
```

- `rows` and `columns` each take one of `country`, `machine_type`, `manufacturer`, `supplier`, `automation_level`, `environment`, `commodity` or `commissioning_year`, and must differ. Anything else, a missing value or a repeated parameter returns `400` (`invalid rows parameter` or `invalid columns parameter`).
- Cells are listed largest first, then by row and column key. A `null` key is the unknown group, as in the breakdowns; `automation_level` uses the same effective level, so unclassified machines are `null`.
- Without `commissioning_year`, every matching verified deployment counts whatever its status, like `GET /api/analytics/breakdowns`.
- With `commissioning_year`, the measure follows the timeline: `announced` deployments and years after the current one are left out, so each year's cells add up to that year's `newly_commissioned`. Years are returned as strings (`"2021"`), and deployments with no commissioning year sit under `null`.
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
  "installation_types": ["factory_installed", "retrofit", "unknown"],
  "countries": ["AU", "BR", "CA", "CL", "FI", "ID", "PE", "SE", "US", "XR", "ZA"]
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
| `latitude` | number | No | Site latitude between -90 and 90; provide with `longitude` to place a contributed site on the map |
| `longitude` | number | No | Site longitude between -180 and 180; provide with `latitude` to place a contributed site on the map |
| `region` | string | No | ≤ 100 characters |
| `commodity` | string | No | ≤ 100 characters |
| `machine_type` | string | Yes | One of `machine_types` |
| `machine_manufacturer` | string | Yes | ≤ 200 characters |
| `machine_model` | string | Yes | ≤ 200 characters (FR-07) |
| `machine_model_variant` | string or null | No | ≤ 100 characters; omitted, null or blank becomes `null`. Explicit `base` remains distinct; comparison is case-insensitive |
| `quantity` | number | Yes | Whole number 1–100000 |
| `environment` | string | No | One of `environments` |
| `deployment_status` | string | No | One of `deployment_statuses` |
| `automation_level` | string | Yes | One of `automation_levels`; stored on the deployment, with or without a product (FR-07, FR-57) |
| `installation_type` | string | No | One of `installation_types`; defaults to `unknown` |
| `technology_supplier` | string | Yes | ≤ 200 characters; stored on the deployment (FR-07) |
| `technology_product` | string | No | ≤ 200 characters; filed under `technology_supplier` |
| `commissioning_date` | string | No | `YYYY` or a real `YYYY-MM-DD` date |
| `evidence_urls` | string[] | No | Up to 10 `http`/`https` URLs; blanks and duplicates are dropped |
| `contributor_email` | string | No | Valid email address |
| `organisation` | string | No | ≤ 200 characters |
| `disclosure_accepted` | boolean | Yes | Must be `true` (FR-41) |
| `website` | string | No | Honeypot (FR-51): the form keeps this field hidden from people and assistive technology, so it must be absent or blank |

`null` or a blank string counts as not supplied. Latitude and longitude must be supplied together when either is provided. Unknown fields are ignored.

### Response — `201 Created`

```json
{ "id": 42, "verification_status": "pending_review", "key": "Xr7…43 characters" }
```

The record stays out of public map, site detail, register and analytics responses until an administrator verifies it.

A submission that replaces a rejected one names it with
`"resubmission_of": {"id": 41, "key": "…"}` (FR-60). The link is stored only when
the key opens that submission and it is `rejected`; otherwise the request returns
`400 {"error":"invalid contribution","fields":{"resubmission_of":"is not a
rejected submission of yours"}}` and nothing is stored.

`key` is the submission's private key (FR-59): 43 URL-safe characters, returned
this once and never again. Only its SHA-256 hash is stored. The contributor's
browser keeps it to follow and update the submission without an account; see
[Following one's own submissions](#following-ones-own-submissions).

### Errors

- Invalid fields: `400 {"error":"invalid contribution","fields":{...}}` with all invalid fields listed.
- `website` filled: `400 {"error":"invalid contribution"}` with no `fields`, checked before any other validation, and nothing is stored.
- Malformed JSON: `400 {"error":"invalid JSON body"}`.
- Oversized JSON: `413 {"error":"request body too large"}`; request limit is 100 kB.

### Behaviour

- All writes occur in one transaction; any failure rolls everything back.
- Companies, regions, sites, machine models and technology products are reused case-insensitively when they match; otherwise they are created.
- The supplier is stored on the deployment. Without a product name no placeholder product is created; a named product is filed under the supplier.
- When supplied together, contribution coordinates are stored as the site's PostGIS point. An existing same-name site without a point is filled in by a later contribution or administrator correction.
- `commissioning_date: "YYYY"` stores only `commissioning_year`; a full date stores both and sets `valid_from`.
- A submission with `deployment_status: "decommissioned"` gets `valid_to` set to the submission date (never before `valid_from`), so it is not shown as in service once verified (#156).
- Every submission creates a contributor row, with `email` and `organisation` left empty when none were given, because each revision names exactly one actor (migration 005).
- A `create` revision stores the submission snapshot without contact details.

---

## `PATCH /api/deployments/{id}`

Corrects an existing deployment. Site, company and model details remain administrator-managed.

| Field | Rule |
|---|---|
| `quantity`, `environment`, `deployment_status`, `automation_level`, `installation_type`, `commissioning_date` | Same rules as contribution submission; omitted or `null` leaves the value unchanged |
| `evidence_urls` | URLs to add; existing ones are ignored |
| `contributor_email`, `organisation` | Optional contact details; a contributor row is recorded either way, empty when none are given |
| `change_note` | Optional, ≤ 1000 characters |
| `disclosure_accepted` | Must be `true` |
| `website` | Honeypot, as for contributions: must be absent or blank |

At least one correctable field or evidence URL must be supplied.

Only a verified record can be corrected (#114). The correction is stored as a proposal and the record is not changed. It stays in public views with its current values until an administrator decides the correction (`POST /api/admin/corrections/{id}/reviews`). Only the fields that differ from the current record are kept, together with their values at submission time. New evidence URLs are kept with the proposal and are added to the record only if it is approved.

A record in any other status (`pending_review`, `changes_requested`, `unverified`, `rejected`) returns `403 {"error":"only verified records can be corrected"}` and nothing is stored. Before verification only a record's contributor may change it (FR-46), which needs the submission key (#205).

### Response — `202 Accepted`

```json
{ "id": 10, "correction_id": 4, "verification_status": "verified" }
```

Invalid corrections return `400`, a filled `website` field returns `400 {"error":"invalid correction"}` with no `fields` and stores nothing, a no-op returns `400 {"error":"correction does not change the record"}`, and an unknown id returns `404`. The deployment row is locked for the transaction, so concurrent corrections queue up.

---

## Following one's own submissions

A contributor follows their submissions with the key each one was given (FR-59).
A wrong key, a missing key and an unknown or keyless record all look the same
from outside: the item is left out, or the request answers `404`. Records loaded
without review have no key and are never reachable here. Keys travel in the
request body or the `X-Contribution-Key` header, never in a URL.

### `POST /api/contributions/status`

Request: `{"items": [{"id": 42, "key": "…"}, …]}`, 1 to 50 pairs.

`200 {"items": [...]}`: one item for each pair whose key matches, ordered by
`id`. Each item has `id`, `verification_status`, `site_id`, `site_name`,
`country_code`, `machine_manufacturer`, `machine_model`, `machine_type`,
`quantity`, `submitted_at`, `updated_at`, `decision`, `resubmission_of` (the
rejected submission this one replaces) and `resubmitted_as` (the latest
submission that replaced this one), each an id or `null`. `decision` is the
latest decision on the record itself, `{"decision", "note", "decided_at"}`, or
`null` before any; decisions on proposed corrections are not included. The note
is what the administrator wrote for the contributor.

Anything other than 1 to 50 pairs, each with a positive integer `id` and a
well-formed `key`, returns `400 {"error":"items must hold 1 to 50 submissions,
each with its id and key"}`.

### `GET /api/contributions/{id}`

With the key in `X-Contribution-Key`: `200` with the status item above, plus
the values the update form needs: the site's `latitude` and `longitude`
(`null` when it has none), `region`, `commodity`, `machine_model_variant`,
`technology_supplier`, `technology_product` (so a rejected submission can be
resubmitted from it), `environment`, `deployment_status`,
`automation_level`, `installation_type`, `commissioning_date` (a date, or the
year alone) and `evidence_urls`. Otherwise `404 {"error":"contribution not found"}`.

### `PATCH /api/contributions/{id}`

With the key in `X-Contribution-Key`, the contributor answers a request for
changes (FR-46). The body is the same as for
[`PATCH /api/deployments/{id}`](#patch-apideploymentsid): the correctable
fields, new evidence URLs, `change_note` and `disclosure_accepted`; contact
details are ignored, since the original submission already names the
contributor. `latitude` and `longitude`, given together, supply the location
of a site that has none, which approval needs (FR-04). A site that already has
coordinates is shared by every record at it, so moving it returns `400` with
`"the site already has coordinates"` on both fields.

Only a record with `verification_status = changes_requested` can be updated.
The change applies to the record, an `update` revision attributed to the
original contributor keeps the previous values, the previous status and, when
evidence is added, the previous evidence list, and the record returns to
`pending_review`. The validity window follows the change as it does for an
administrator's correction (#156).

| Status | Body |
|---|---|
| `200` | `{"id": 42, "verification_status": "pending_review"}` |
| `400` | `{"error": "invalid update", "fields": {...}}`, `{"error": "update does not change the submission"}`, or `{"error": "invalid update"}` when the hidden `website` field is filled |
| `404` | `{"error": "contribution not found"}` |
| `409` | `{"error": "only a submission with changes requested can be updated", "verification_status": "…"}` |

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

`200 {"items": [...]}`: everything waiting for a decision, oldest first. That is
every deployment with `verification_status = pending_review` (`kind:
"submission"`) and every pending correction to a verified deployment (`kind:
"correction"`). Each item has:

- `id` (the deployment), `site_name`, `country_code`, `region`,
  `latitude`, `longitude`,
  `machine_manufacturer`, `machine_model`, `machine_type`, `quantity`,
  `technology_supplier`, `technology_product`: the record's current values;
- `kind` and `correction_id` (`null` for a submission);
- `changed_fields`: the API field names a correction would change, plus
  `evidence_urls` when it adds sources (`[]` for a submission);
- `after_changes_requested`: `true` when the contributor's update answers an
  administrator's request for changes;
- `resubmission_of`: the rejected record this submission replaces, or `null`;
- `evidence_count`: the record's evidence for a submission, or the sources
  supplied with a correction;
- `contributor_email`, `contributor_organisation`: whoever submitted it, when
  they said;
- `submitted_at`: when the record last changed, or when the correction was sent.

### `GET /api/admin/submissions`

Lists submission history across verification statuses. Requires an
authenticated administrator with moderation access.

Query parameters:

| Parameter | Default | Validation |
|---|---|---|
| `limit` | `50` | Safe integer from 1 to 100 |
| `offset` | `0` | Non-negative safe integer |
| `id` | Omitted | Positive safe integer; exact deployment ID |
| `q` | Omitted | Free text: deployments whose ID starts with these digits, or whose site name contains the text (case-insensitive; `%` and `_` match themselves). Blank means no search |
| `sort` | `updated` | `id`, `site`, `decision`, `status` or `updated`. `decision` and `status` sort by their stored value, which follows their labels; records without a decision come last in either order. Ties go to the newest record |
| `order` | `desc` for `updated`, otherwise `asc` | `asc` or `desc` |
| `status` | Omitted | One verification status: `unverified`, `pending_review`, `changes_requested`, `verified` or `rejected`. `changes_requested` lists the records waiting on their contributor; `updated_at` is when they were sent back |

Success: `200 OK`, returning `{"items": [...]}`. Each item includes
`id`, `site_name`, `country_code`, `verification_status`,
`latest_decision`, `latest_decision_is_correction`, and `updated_at`.
The latest decision can come from a deployment review or a correction review.

`latest_decision_is_correction` indicates the source of the latest decision:
- `true`: the latest decision was made on a correction;
- `false`: the latest decision was made on the deployment itself;
- `null`: no review decision has been recorded.

Invalid parameters return `400 Bad Request` with
`{"error":"invalid pagination or submission ID"}`.
Examples: `limit=0`, `limit=101`, `offset=-1`, `id=0`, `id=abc`.
A repeated `q` returns `{"error":"invalid q parameter"}`. An unknown `sort` returns `{"error":"invalid sort parameter"}` and an unknown
`order` returns `{"error":"invalid order parameter"}`, and an unknown `status` returns
`{"error":"invalid status parameter"}`, all with `400`.

Unauthenticated requests return `401 Unauthorized`.

### `GET /api/admin/deployments/{id}`

`200` with the record in any verification status: `verification_status`, site
(including nullable `latitude` and `longitude`),
machine, technology, deployment fields (as in the register, plus `valid_from`,
`valid_to`, `created_at`, `updated_at`), and:

- `evidence`: `url`, `source_type`, `publisher`, `published_date`;
- `reviews`: `decision`, `note`, `administrator` (email), `reviewed_at`, and
  `correction_id` when the decision was on a correction rather than the record;
- `revisions`: `action` (`create`, `update`, `verification_change`),
  `previous_values`, `change_note`, `contributor_email`,
  `contributor_organisation`, `administrator`, `changed_at`;
- `corrections`: every correction proposed for the record, oldest first, with
  `id`, `status` (`pending`, `approved`, `rejected`, `needs_changes`),
  `submitted_at`, `contributor_email`, `contributor_organisation`,
  `change_note`, `evidence_urls`, and `changes`. Each entry in `changes` is
  `{"field", "before", "proposed", "current"}`: `before` is the value when the
  correction was sent and `current` the value now, so they differ when the
  record has changed since. Commissioning values are a date or a year
  (`"2021-01-01"`, `"2020"`).
- `possible_duplicates`: an array of other deployments that may match this
  record. Each entry contains `id`, `verification_status`,
  `machine_manufacturer`, `machine_model`, `machine_type`,
  `technology_product`, `quantity`, `commissioning_date`, and `status`.
  `commissioning_date` may be `null`. The array is empty when no potential
  matches are found.

  A possible duplicate must belong to the same site, have the same
  deployment-level technology supplier, and match either the machine model
  or machine type. Deployments that are `pending_review`, `changes_requested`,
  `verified` or `rejected` are considered, so a resubmission shows the earlier
  attempt. The current deployment is excluded.
- `resubmission_of`: the rejected record this one replaces, `{"id",
  "verification_status", "decision", "note", "administrator", "reviewed_at"}`
  with the decision that closed it, or `null` (FR-60).
- `resubmitted_as`: the records submitted to replace this one, each
  `{"id", "verification_status"}`.
  Technology products do not need to match and may be `null`.

`404` for an unknown or malformed id.

### `POST /api/admin/deployments/{id}/reviews`

Request: `{"decision": "approved" | "rejected" | "needs_changes", "note": "…"}`.
The note (up to 2,000 characters) is required unless approving, and is shown to
the contributor (FR-45).

A decision can be recorded on a record that is `pending_review` or
`changes_requested` (FR-45). An administrator who fixes a record with changes
requested can approve it without sending it back to the queue, and one whose
changes never arrive can be rejected.

| Decision | New `verification_status` |
|---|---|
| `approved` | `verified` |
| `rejected` | `rejected`. The record is closed: it cannot be decided or corrected again |
| `needs_changes` | `changes_requested`. The record leaves the queue and waits on its contributor |

The review row, the new status and a `verification_change` revision holding the
previous status are written in one transaction.
Approval needs at least one evidence URL and site coordinates. A technology
product is not required (FR-08); the supplier and automation level are always
present, since every deployment carries them.

| Status | Body |
|---|---|
| `201` | `{"id": <review id>, "verification_status": "verified"}` |
| `400` | `{"error": "invalid review", "fields": {...}}` |
| `404` | `{"error": "deployment not found"}` |
| `409` | `{"error": "only records pending review or with changes requested can be decided", "verification_status": "…"}` |
| `409` | `{"error": "at least one evidence URL is required before the record can be verified"}` |
| `409` | `{"error": "site coordinates are required before the record can be verified"}` |

### `POST /api/admin/corrections/{id}/reviews`

Decides a correction proposed for a verified record. The request is the same as
for a record: `{"decision": "approved" | "rejected" | "needs_changes", "note": "…"}`,
with the note required unless approving.

| Decision | Effect |
|---|---|
| `approved` | The proposed values are applied to the record as it is now, its new evidence URLs are added, and an `update` revision attributed to the correction's contributor keeps the previous values. The record stays `verified`. |
| `rejected`, `needs_changes` | The record is not changed. The contributor can send a new correction. |

The correction's new status and a review row carrying `correction_id` are written
in the same transaction. A correction is decided once: its row is locked, and the
database refuses any later change to it.

| Status | Body |
|---|---|
| `201` | `{"id": <review id>, "correction_status": "approved", "verification_status": "verified"}` |
| `400` | `{"error": "invalid review", "fields": {...}}` |
| `404` | `{"error": "correction not found"}` |
| `409` | `{"error": "only pending corrections can be decided", "correction_status": "…"}` |
| `409` | `{"error": "the proposed commissioning date is after the record's valid_to; correct the record or reject the proposal"}`: approving would end the validity window before it starts, so nothing changes and the proposal stays pending |

### `PATCH /api/admin/deployments/{id}`

Takes the fields of the public correction (`quantity`, `environment`,
`deployment_status`, `automation_level`, `installation_type`,
`commissioning_date`, `evidence_urls`, `change_note`) plus
`technology_supplier`, on its own or with a `technology_product` of that
supplier (a product needs its supplier), `latitude` and `longitude` together
for a contributed site, and `valid_from` and `valid_to` as `YYYY-MM-DD` dates
(FR-11). Changing the supplier without naming a product drops a product that
belonged to the old supplier. An end before the start, given together or
against the record, returns `400` with
`{"fields": {"valid_to": "must not be before valid_from"}}`.
`clear_valid_from: true` and `clear_valid_to: true` remove a date, for example
the end date of a record that is back in service; omitted or `false` changes
nothing, and a flag sent with a value for the same date returns `400`. With no
`valid_from` the window has no lower bound, and with no `valid_to` no end.
The automation level can be corrected but not cleared:
`clear_automation_level: true` returns `400`, since every deployment carries a
level (FR-57).
There are no contributor fields and no disclosure. The previous values are kept
in an `update` revision attributed to the administrator, and the verification
status does not change. A rejected record is closed and returns `409
{"error": "a rejected record is closed and cannot be corrected"}` (FR-45).
Other responses: `200 {"id", "verification_status"}`, `400` for invalid input
or a correction that changes nothing, `404` for an unknown record.

### Validity window on corrections (#156)

Every path that changes a record (a direct public correction, an approved
proposal and an administrator's correction) keeps `valid_from`..`valid_to` in
step, because the map and the timeline decide what is in service from it:

- When `deployment_status` becomes `decommissioned` and no `valid_to` is
  recorded, `valid_to` is set to today, never before `valid_from`. An explicit
  `valid_to` from an administrator, or one already recorded, is kept. A proposal
  sets nothing until it is approved.
- When `commissioning_date` changes and `valid_from` was the old commissioning
  date, `valid_from` moves with it. A `valid_from` set separately, as after a
  relocation, is left alone, and a year-only date never invents a start.
- If that would put `valid_from` after the recorded `valid_to`, nothing is
  stored: a correction returns `400` with
  `{"fields": {"commissioning_date": "must not be after valid_to"}}`, and
  approving a proposal returns `409` and leaves it pending. An administrator can
  send the new end date, or `clear_valid_to`, in the same correction.
- The status is not reopened automatically: a record changed back from
  `decommissioned` keeps its `valid_to` until an administrator clears or moves it.

The previous values go into the `update` revision with the other changed fields.

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
- New submissions start as `pending_review`. A public correction to a verified record is stored as a proposal (`202`), and the record stays public and unchanged until an administrator approves it (FR-48). FR-51 anti-spam controls are still needed before public launch.
- Administrator revision/review history endpoints belong to #66.
- Persistence currently uses the shared parameterised `query()`/`withTransaction()` layer and is planned to move to Drizzle with #71.
