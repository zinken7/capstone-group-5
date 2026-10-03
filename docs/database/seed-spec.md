# Seed data spec — issue #26

Target `backend/`. Schema `migrations/001_initial_schema.sql`. Style matches
`src/migrate.ts`: raw `pg`, `tsx`, explicit transactions, no ORM.

## 1. Two kinds of data, two loaders

| | Reference data | Fixtures |
|---|---|---|
| What | Regions; companies (OEMs, technology suppliers, mine owners, operators, contractors); machine models; technology products (with automation level + basis) | Mine sites, site ownership roles, deployments |
| Nature | Real, public, sourced | Invented |
| Environments | All, including production | Development and test only |
| Load strategy | Upsert on natural key | Truncate fixture tables, insert in file order |
| Command | `npm run db:seed:reference` | `npm run db:seed:fixtures` |
| Idempotent | Yes — re-run is a no-op unless data changed | Yes — re-run produces an identical database |
| Guard | none | refuses when `NODE_ENV === 'production'` |

`npm run db:seed` runs both, for local development. The Docker backend
entrypoint runs `db:migrate` then `db:seed:reference`; it never runs fixtures.
Tests load fixtures in `beforeAll`.

Why this split: the SRS defines automation levels as administrator-maintained
reference data, so the catalogue is product content and belongs in every
environment. Sites and deployments are what contributors submit; synthetic
ones exist only to develop against. "Clearly identified as synthetic" (#26)
is then structural: everything under `fixtures/` is fictional by definition.

### 1.1 Real or invented, per table

The test: does the row **describe a thing** or **make a claim**? Things that
exist (a company, a model, a region, a product) are real and sourced. Claims
(*this fleet, at this place, at this time*) are invented, and an invented
claim is only harmless when it is about an invented place.

| Table | Fixtures | Why |
|---|---|---|
| `company` | Real | Public entities; any real record will reference them |
| `region` | Real | Geographic reference; nothing to invent |
| `machine_model` | Real | Catalogue; specs from spec sheets |
| `technology_product` | Real | The client's classification applied to real products, with basis and source |
| `site` | **Invented** | A real site with invented deployments is a false claim about a real place |
| `site_company_role` | Real companies on invented sites | "Rio Tinto owns Wandarra Iron" is visibly fictional because Wandarra Iron does not exist |
| `deployment` | **Invented** | Quantities, dates and statuses are the facts the product exists to get right |

Never an invented number on a real site. Real deployments are product
content, not fixtures: they arrive with evidence and a `data_source` of
`contributor` or `admin`, once migration 002 provides the tables.

For the tables migration 002 adds: `evidence` has no fixture rows (invented
URLs prove nothing); `verification_review` and `revision` may be invented,
since they exercise a workflow rather than assert a fact; `contributor` and
`admin_user` fixtures are test accounts (`test-admin@example.com`), never
real ones.

## 2. Layout

```
backend/seed/
  README.md
  reference/
    regions.json
    companies.json            every real company: OEMs, suppliers, owners, operators, contractors
    machine_models.json
    technology_products.json
  fixtures/
    companies.json            normally empty; see §5
    sites.json                site_company_role nested under each site
    deployments.json
```

A table's file may be split by ISO country suffix when it grows —
`sites.au.json`, `sites.cn.json` — and the loader merges every
`<table>[.<suffix>].json` it finds. Split by country, never by author.

## 3. Keys and references

Every object carries a `key`: lowercase ASCII, hyphenated, unique within its
table across all files. Keys are for cross-references inside the seed
(`"site": "wandarra-iron"`) and are not stored in the database.

No explicit `id` values anywhere. Reference rows resolve to existing DB rows
through their natural keys; fixture rows get identity-assigned ids, which are
deterministic because the load truncates and inserts in a fixed order
(file order, then array order).

Companies and sites may carry `aliases`: an array of `{ "alias", "language" }`
(`language` is BCP-47: `en`, `zh`, `zh-Latn` for pinyin). Aliases resolve to
the canonical `name`; they are how the product later recognises "Cat" as
Caterpillar and "黑岱沟" as Heidaigou. 001 has no alias table yet (see §9); the
loader validates the field and loads it only when `company_alias` /
`site_alias` exist, so the data is ready the day the migration lands.

Chinese entities: `key` in pinyin (`cidi`, `heidaigou-north`), `name` the
canonical romanised form, and the Hanzi name as an alias with `language: "zh"`.

## 4. Conventions

- `country_code`: ISO 3166-1 alpha-2, uppercase.
- Dates: `YYYY-MM-DD` strings; `null` when unknown.
- Enum values: exact PostgreSQL labels from 001. Enums are defined once in
  TypeScript (`src/types.ts`) and imported by the loader's schemas, so seed
  data and API cannot disagree.
- Coordinates: `lat`, `lng` on the site; loader writes
  `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`; both null → `point_4326` null.
- `commodity` is free text in 001; use a fixed vocabulary:
  `iron_ore`, `coal`, `copper`, `gold`, `lithium`, `nickel`, `bauxite`, `oil_sands`.
- Reference rows carry a `source` field: the URL that supports the row
  (product page, spec sheet). Not stored; it is the provenance for the
  catalogue and the justification for each `level_basis`. Fixture rows do
  not have one.

## 5. JSON shapes

### reference/regions.json
```json
{ "key": "pilbara", "name": "Pilbara", "country_code": "AU" }
```
Upsert on `(name, country_code)`.

### reference/companies.json
```json
{ "key": "cidi", "name": "CiDi", "country_code": "CN",
  "aliases": [ { "alias": "希迪智驾", "language": "zh" },
               { "alias": "Xidi Zhijia", "language": "zh-Latn" } ],
  "source": "https://www.cidi.ai/" }
{ "key": "caterpillar", "name": "Caterpillar", "country_code": "US",
  "aliases": [ { "alias": "Cat", "language": "en" } ],
  "source": "https://www.caterpillar.com/" }
```
Upsert on `name`. Mine owners, operators and contractors live here too,
each with a `source`. Spellings are agreed in this file, once:
`Caterpillar`, `Komatsu`, `Sandvik`, `Epiroc`, `Rio Tinto` — no legal
suffixes.

### reference/machine_models.json
```json
{ "key": "cat-793f", "manufacturer": "caterpillar", "model_name": "793F",
  "machine_type": "haul_truck", "size_class": "ultra_class",
  "max_payload_tonnes": 227, "operating_weight_tonnes": 386,
  "source": "https://www.cat.com/.../793f" }

{ "key": "cat-haul-truck", "manufacturer": "caterpillar", "model_name": null,
  "machine_type": "haul_truck", "size_class": null,
  "max_payload_tonnes": null, "operating_weight_tonnes": null }
```
Two upsert paths, matching 001's two partial unique indexes:
- named: `ON CONFLICT (manufacturer_id, model_name) WHERE model_name IS NOT NULL`
- unnamed: `ON CONFLICT (manufacturer_id, machine_type) WHERE model_name IS NULL`

Include an unnamed row for each manufacturer/type that fixtures need — it is
the "a Caterpillar haul truck, model unknown" case from the SRS.

### reference/technology_products.json
```json
{ "key": "cat-command-hauling", "supplier": "caterpillar",
  "product_name": "Cat Command for Hauling", "vendor_term": "Autonomous haulage",
  "automation_level": "autonomous",
  "level_basis": "Unattended operation of the full haul cycle under fleet supervision; ISO 17757 autonomous machine.",
  "source": "https://www.cat.com/.../command-for-hauling" }
```
Upsert on `(supplier_id, product_name)`. All four levels must appear. One
product ships with `automation_level: null` — the "awaiting administrator
classification" state the UI has to render.

### fixtures/companies.json
```json
[]
```
Normally empty. Only for a role that must not resolve to a real company —
a test case, never a stand-in for a real owner. Upsert on `name` (same
statement as reference companies; the truncate does not touch `company`).

### fixtures/sites.json
```json
{ "key": "wandarra-iron", "name": "Wandarra Iron", "country_code": "AU",
  "region": "pilbara", "commodity": "iron_ore", "mine_status": "operating",
  "lat": -22.61, "lng": 119.32,
  "roles": [
    { "company": "rio-tinto", "role": "owner" },
    { "company": "rio-tinto", "role": "operator" }
  ] }
```
`region` nullable. When set, the loader checks the region's country equals
the site's before insert (001 enforces it with a composite FK; the loader
turns the constraint error into a readable one). `roles` become
`site_company_role` rows; companies resolve against `reference/companies.json`
first, then `fixtures/companies.json`. Site names must read as invented.

### fixtures/deployments.json
```json
{ "key": "wandarra-793f-command-2019", "site": "wandarra-iron",
  "machine_model": "cat-793f", "technology_product": "cat-command-hauling",
  "quantity": 36, "environment": "surface",
  "commissioning_date": "2019-06-01", "status": "operational",
  "verification_status": "verified",
  "valid_from": "2019-06-01", "valid_to": null }
```
Loader-checked before insert (mirrors 001 CHECKs): `quantity > 0`;
`verified` requires a technology product; `valid_to >= valid_from`.

## 6. Loader — `src/seed/`

```
src/seed/
  index.ts        CLI: --reference, --fixtures, or both; env guard
  schemas.ts      zod schemas per file; enums imported from src/types.ts
  load.ts         read + merge files, validate, resolve keys, build insert plan
  reference.ts    upsert statements per reference table
  aliases.ts      alias upserts, gated on the alias tables existing
  fixtures.ts     truncate + insert statements
```

Sequence for `--fixtures`:
1. Refuse if `NODE_ENV === 'production'`.
2. Read and validate every file. Validation fails as a whole, before any DB
   call, with `file / key / field / message`.
3. Resolve every reference to a key. Unknown key → error.
4. `BEGIN`.
5. `TRUNCATE deployment, site_company_role, site RESTART IDENTITY`.
6. Upsert `fixtures/companies.json` rows into `company` (usually none).
7. Insert sites in order; then roles; then deployments. Resolve foreign keys
   by querying the natural key (`SELECT id FROM company WHERE name = $1`),
   cached per run.
8. `COMMIT`. Print row counts.

Sequence for `--reference`: steps 2–4, then upserts in order company →
region → machine_model → technology_product, then `COMMIT`. Rows removed
from JSON are not deleted from the DB; that is deliberate (reference data is
never destructively synced) and documented in README.

## 7. Tests — `src/seed/seed.test.ts` (vitest)

Against a migrated test database:

1. `--reference` twice → identical row counts and identical
   `md5(string_agg(row::text, ',' ORDER BY id))` per reference table.
2. `--fixtures` twice → identical counts, identical checksums, identical id
   sets (the truncate makes ids reproducible).
3. Coverage assertions, one `it()` each, from the scenario list in §8.
4. A fixture that violates a constraint (e.g. `verified` with null product)
   is rejected by validation, not by the database.

## 8. Fixture scenarios — the coverage contract

Fixtures exist to exercise the SRS use cases. Each scenario names the query
it serves and the assertion that proves it is present.

| Scenario | Serves | Assertion |
|---|---|---|
| Every `deployment_status` present | map marker colours, register filter | `COUNT(DISTINCT status) = 4` |
| Every `verification_status` present | verified-only default view | `COUNT(DISTINCT verification_status) = 4` |
| Every `automation_level` in use by ≥ 1 deployment | "find lower-tier sites" (Epiroc, RCT) | join products, `COUNT(DISTINCT automation_level) = 4` |
| One product awaiting classification | admin reference-data maintenance | `automation_level IS NULL` count = 1 |
| Surface and underground; ≥ 1 site `both` | environment filter | |
| ≥ 8 countries, ≥ 6 regions, ≥ 1 site with null region | country/region grouping | |
| ≥ 1 site with null coordinates | FR-07 varying completeness; map must not crash | |
| JV site with two owners | many-to-many ownership | |
| Site with contractor role | contractor as market participant | |
| Deployment on an unnamed machine model | "Caterpillar haul truck, model unknown" | |
| Retrofit: OEM truck, third-party automation, ≥ 2 | manufacturer ≠ supplier — the core SRS point | |
| ≥ 1 deployment with null technology product, `unverified` | submission before classification | |
| `decommissioned` deployment with `valid_to` set | time slider, history | |
| Relocation: one deployment closed at site A, same model/product opened at site B | valid_from/valid_to semantics | |
| `commissioning_date` spans 2008–2026 with ≥ 3 per year 2020–2026 | trend chart is not flat | |
| One supplier whose share grows, one whose share shrinks over 2018–2026 | RCT market-share-over-time | |
| ≥ 3 sites sharing commodity + environment + machine type across ≥ 2 suppliers | Epiroc "comparable sites" query | |
| China ≈ 40% of deployments and of machines | A-07 — China is not a rounding error | |
| Every CN company and site has a `zh` alias; ≥ 3 western companies have an `en` short-form alias | romanisation / duplicate risk | JSON-level check |

Row targets that satisfy the above: 10 regions, ~22 companies (OEMs,
suppliers, owners, operators, contractors), ~18 models, ~12 products,
~22 sites, ~45 roles, ~60 deployments.

## 9. Open items for migration 002

1. `data_source TEXT` on `site` and `deployment`, values `contributor`,
   `admin`, `fixture` — replaces "it is in fixtures/" with a queryable flag,
   and is what a real import from a client CSV would need.
2. `company_alias (id, company_id FK, alias TEXT UNIQUE, language TEXT)` and
   `site_alias` with the same shape. Many aliases per entity; an alias points
   to exactly one entity. Serves duplicate detection on submission (R-04),
   autocomplete in the contribute form, and search on any name variant. The
   seed already carries the data; the loader starts writing it as soon as the
   tables exist.
3. `commodity` as an enum or lookup table.
4. When `evidence`, `contributor`, `admin_user`, `revision`,
   `verification_review` land: extend fixtures with evidence per deployment,
   a rejected review with a note, a three-revision history, and two admin
   accounts. Same layout, same loader.