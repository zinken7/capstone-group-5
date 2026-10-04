# Backend API Reference and Design Rationale

## Endpoint list

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/map` | Returns site location data for map rendering (GeoJSON) |
| `GET` | `/api/sites/{id}` | Returns full detail for a single site, for the site detail panel |
| `GET` | `/api/register` | Returns a page of the equipment register: searchable, filterable, sortable (FR-36) |
| `GET` | `/api/register/export` | Downloads every matching register row as CSV (FR-37) |
| `GET` | `/api/analytics/summary` | Returns total machines, sites and countries (FR-21) |

All endpoints only return deployments with `verification_status = verified` by default (FR-43).

## Design principle: contract first

Fields and enum values are aligned with the controlled-values table in `docs/database/ERD.md`; functional behaviour is aligned with section 4.2 of `docs/SRS/SRS.md`. Both endpoints read from PostGIS through the repository in `backend/src/repositories/sites.ts`; every filter is executed in SQL with parameterised queries (NFR-05).

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
| `type`/`features[].type`/`geometry` | Standard GeoJSON structure |
| `geometry.coordinates` | `[longitude, latitude]` |
| `excluded_count` | Number of deployments excluded by the date filter (FR-19) |
| `properties.id`/`name` | Site identifier and name |
| `properties.status` | Derived field: the highest-precedence status among the site's deployments (FR-16) |
| `properties.technology_suppliers` | Array — a site may have multiple suppliers (FR-18) |

### Error responses

| Status | Trigger condition |
|---|---|
| `400 Bad Request` | `bbox` or `date` is malformed, `{"error": "invalid bbox parameter"}` / `{"error": "invalid date parameter"}` |

### Design rationale

- **GeoJSON format**: matches Leaflet (`prototype/docs/ARCHITECTURE.md`) and the earlier prototype's `/api/map` in `prototype/app/api.py`, so the frontend needs no conversion.
- **`status` is a runtime-derived field**: a site may have multiple deployments in different states, so the highest-precedence one is taken (`operational > commissioning > announced > decommissioned`). Storing it as a fixed field would let it drift out of sync with the deployment data, so it's computed at runtime (`deriveSiteStatus`) and can be reused by other pages.
- **`excluded_count`**: FR-19 requires stating how many records were excluded when filtering by date, so users don't mistake a "filtered-down empty result" for "this site never had a deployment."
- **Tiered filtering**: site-level conditions (`bbox`/`country`/`region`/`commodity`) are applied first to filter sites, then deployment-level conditions (`supplier`/`machine_type`/`automation_level`/`environment`) filter deployments, with `date` handled separately. This is because the `date` filter must also compute `excluded_count`, and mixing it into the same pass as the other conditions would make the count inaccurate. All of this runs in one SQL statement: `bbox` is a PostGIS envelope test on `site.point_4326` (GiST-indexed), and `date` is evaluated as two boolean columns (`excluded`, `in_window`) so the count and the filter come from the same row set. Sites without coordinates cannot be placed on the map and are omitted.
- **`automation_level`/`environment` filter only, not displayed**: the map marker only needs `status` and `technology_suppliers`.
- **`bbox`/`date` malformed input returns 400**: silently ignoring an invalid parameter would make the user think filtering was applied, so it errors explicitly instead.

---

## `GET /api/sites/{id}`

### Request parameters

| Parameter | Location | Type | Description |
|---|---|---|---|
| `id` | Path | integer | Site identifier |

No query parameters.

### Response — `200 OK`

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

| Field | Description |
|---|---|
| `id`/`name`/`country_code`/`region`/`commodity` | Site base attributes |
| `mine_status` | The mine's own operating status: `operating`\|`commissioning` (`site_status` enum), or `null` when not recorded |
| `latitude`/`longitude` | Split from `SITE.point_4326` with `ST_Y`/`ST_X`; `null` when the site has no coordinates |
| `deployments[]` | The site's verified deployment records (FR-17) |
| `deployments[].machine_manufacturer` | Base machine manufacturer; separate from the technology supplier |
| `deployments[].machine_model` | May be `null`; the frontend should fall back to displaying `machine_type` |
| `deployments[].automation_level` | Four-level classification when known: the deployment's own level, otherwise its technology product's level; may be `null` for an unclassified record |
| `deployments[].environment` | `surface`, `underground` or `both` |
| `deployments[].technology_supplier` | Derived field, obtained via the `technology_product → company` relationship |
| `deployments[].valid_from`/`valid_to` | Deployment validity window used by historical map views |

### Error responses

| Status | Trigger condition |
|---|---|
| `404 Not Found` | No site with the given `id`, `{"error": "site not found"}` |

### Design rationale

- **No query parameters**: the detail panel needs the complete data in one shot, with no secondary filtering scenario.
- **`deployments[].machine_model` may be `null`**: crowdsourced data isn't always precise down to the model, and FR-17 requires falling back to the machine type when there's no model, with the fallback logic left to the frontend.
- **`technology_supplier` is a derived field**: per the ERD it requires two hops — `deployment.technology_product_id → technology_product.supplier_id → company.name` — to obtain, which the backend resolves in one pass, reducing round trips for the frontend.
- **`mine_status` follows the `site_status` enum** defined in `backend/migrations/001_initial_schema.sql` (`operating`/`commissioning`).

---

## Shared deployment filters

`GET /api/register`, `GET /api/register/export` and `GET /api/analytics/summary` accept the same optional query parameters, so a filtered register, its export and its headline numbers always describe the same set of verified deployments. Blank values are ignored; a parameter given more than once returns `400` (`{"error": "invalid <name> parameter"}`).

| Parameter | Matches |
|---|---|
| `q` | Case-insensitive text search across site name, machine model, manufacturer, technology supplier and technology product |
| `country` | Site country code, e.g. `AU` |
| `region` | Region name |
| `commodity` | Site commodity |
| `supplier` | Technology supplier name |
| `manufacturer` | Machine manufacturer name |
| `machine_type` | `machine_type` enum value, e.g. `haul_truck` |
| `automation_level` | Deployment automation level, falling back to the technology product's level |
| `environment` | `surface`, `underground` or `both` |
| `status` | `announced`, `commissioning`, `operational` or `decommissioned` |

As with `/api/map`, an enum value outside the controlled list matches nothing rather than returning an error.

---

## `GET /api/register`

### Request parameters

The shared filters above, plus:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sort` | `site`\|`country`\|`manufacturer`\|`machine_type`\|`supplier`\|`status`\|`quantity`\|`commissioning` | `site` | Sort column |
| `order` | `asc`\|`desc` | `asc` | Sort direction; missing values always sort last, ties break on `id` |
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

| Field | Description |
|---|---|
| `total` | Number of matching verified deployments across all pages |
| `items[]` | One row per deployment, flattened so the register needs no further joins |
| `items[].model_variant` | `null` when unknown or not supplied; `base` only when explicitly identified |
| `items[].commissioning_date` / `commissioning_year` | A full date when known; `commissioning_year` alone when only the year is known |
| `items[].technology_supplier` / `technology_product` / `automation_level` / `environment` / `status` / `region` / `commodity` | May be `null` |

### Error responses

| Status | Trigger condition |
|---|---|
| `400 Bad Request` | Invalid `sort`, `order`, `limit` or `offset`, or a repeated filter parameter |

---

## `GET /api/register/export`

Accepts the shared filters, `sort` and `order`; `limit` and `offset` are ignored, so the file holds every matching row. Responds with `text/csv; charset=utf-8` as the attachment `autonomous-mining-equipment.csv`.

- Columns and their order match the `items[]` fields of `GET /api/register`.
- RFC 4180 quoting with CRLF line endings; `null` is an empty cell.
- Text beginning with `=`, `+`, `-`, `@`, tab or carriage return is prefixed with `'` so a spreadsheet does not run contributed text as a formula.

Errors are the same as `GET /api/register`.

---

## `GET /api/analytics/summary`

Accepts the shared filters.

### Response — `200 OK`

```json
{ "machine_count": 121, "site_count": 2, "country_count": 1 }
```

| Field | Description |
|---|---|
| `machine_count` | Sum of `quantity` over matching deployments (records are fleets) |
| `site_count` | Distinct sites with at least one matching deployment, including sites without coordinates |
| `country_count` | Distinct site countries |

### Error responses

| Status | Trigger condition |
|---|---|
| `400 Bad Request` | A repeated filter parameter |

---

## Common implementation trade-offs

- **camelCase (internal) → snake_case (response)**: the type definitions (`types.ts`) and the repository layer use TypeScript's conventional camelCase; routes map to snake_case at the boundary.
- **The test fixtures deliberately include one unverified record**: in `backend/src/test/fixtures.ts` the deployment for Kalgoorlie Super Pit is `pending_review`, so the FR-43 filter is exercised by the tests.
- **Filtering runs in SQL, not in the application layer**: the repository builds one parameterised statement per endpoint; optional filters use the `$n IS NULL OR column = $n` pattern so the SQL text is fixed. Enum columns are compared as text, so an unknown value matches nothing rather than raising an error. Site status (FR-16) is still derived in `lib/site-status.ts` so the precedence rule lives in one place.

## Tests

Route tests (`backend/src/routes/*.test.ts`) and repository tests (`backend/src/repositories/*.test.ts`) run against a real PostGIS database, seeding fixtures from `backend/src/test/fixtures.ts` before each case. The suite uses a dedicated test database derived from `DATABASE_URL` (`<name>_test`), created and migrated automatically on first run, and `resetDatabase()` refuses any database not named for testing. Locally, start the database with `docker compose up -d db`, then `npm test`. See `backend/README.md` for details.

## Outstanding

- Sites without coordinates are omitted from `/api/map`; `/api/sites/{id}` returns `null` latitude/longitude for them.
- `valid_from` may be null in the database; the date filter treats that as no lower bound.
- Visibility parameters such as `include_unverified` for moderation.
- The register and summary filters do not include the map's `date` and `bbox` parameters yet.
- The remaining analytics measures (FR-22 to FR-27 breakdowns) are tracked in #67.
