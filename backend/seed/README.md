# Seed data

Two kinds of data, two loaders. The full design is in
[`docs/database/seed-spec.md`](../../docs/database/seed-spec.md); this file is
the working guide for adding rows.

| | `reference/` | `fixtures/` |
|---|---|---|
| What | Regions; companies (OEMs, technology suppliers, mine owners, operators, contractors); machine models; technology products | Mine sites, site ownership roles, deployments |
| Nature | Real and public; every row cites a `source` | Invented. Sites are always invented and must read as invented (Wandarra Iron). Never an invented number on a real site |
| Where it loads | Every environment, including production | Development and test only; refuses when `NODE_ENV=production` |
| How it loads | Upsert on natural key. Rows removed from JSON stay in the database | Truncate `deployment`, `site_company_role`, `site`, then insert in file order |
| Command | `npm run db:seed:reference` | `npm run db:seed:fixtures` |

`npm run db:seed` runs both. The Docker backend entrypoint runs
`db:migrate` then `db:seed:reference` on every start; it never loads fixtures.

The test for which side a row belongs on: does it **describe a thing** or
**make a claim**? Companies, regions, models and products describe things
that exist, so they are real and sourced. A deployment is a claim — *this
fleet, at this place, at this time* — and an invented claim is only harmless
when it is about an invented place. Real deployments are product content, not
fixtures: they arrive with evidence once migration 002 provides the tables.

## Layout

```
seed/
  reference/
    regions.json
    companies.json            every real company: OEMs, suppliers, owners, operators, contractors
    machine_models.json
    technology_products.json
  fixtures/
    companies.json            normally empty; only for a role that must not be a real company
    sites.json                roles nested under each site
    deployments.json
```

Each file is a JSON array. When a table grows, split it by ISO country
suffix, `sites.au.json`, `sites.cn.json`; the loader merges every
`<table>[.<suffix>].json` it finds, in filename order. Split by country,
never by author.

## Keys and references

Every row has a `key`: lowercase ASCII, hyphenated, unique within its table
across all of its files. Keys are how rows point at each other
(`"site": "wandarra-iron"`) and are never stored. Never write an `id`.

| Field | Points at |
|---|---|
| `machine_models[].manufacturer`, `technology_products[].supplier` | `reference/companies.json` |
| `sites[].region` | `reference/regions.json` |
| `sites[].roles[].company` | `reference/companies.json`, or `fixtures/companies.json` for the exceptional case |
| `deployments[].site` | `fixtures/sites.json` |
| `deployments[].machine_model`, `deployments[].technology_product` | the reference files |

In the database, reference rows are found by natural key: company `name`,
region `(name, country_code)`, machine model `(manufacturer, model_name)` or
`(manufacturer, machine_type)` for an unnamed row, technology product
`(supplier, product_name)`. Fixture rows get identity ids, reproducible
because each load truncates and inserts in a fixed order.

## Conventions

- `country_code`: ISO 3166-1 alpha-2, uppercase.
- Dates: `YYYY-MM-DD`; `null` when unknown.
- Enum values are the PostgreSQL labels from `migrations/001_initial_schema.sql`.
  They are defined once in [`src/types.ts`](../src/types.ts) and imported by
  the schemas in [`src/seed/schemas.ts`](../src/seed/schemas.ts).
- `commodity`: `iron_ore`, `coal`, `copper`, `gold`, `lithium`, `nickel`,
  `bauxite`, `oil_sands`, `platinum_group_metals`.
- Coordinates: `lat` and `lng` on the site, both set or both `null`.
- `operating_weight_tonnes` is gross machine operating weight, loaded.
- `source` on a reference row is the URL that supports it: a product page,
  spec sheet or company site. It is not stored. It is the justification for
  each `level_basis`, so a named machine model and every company and product
  must have one. Fixture rows never have a `source`.
- Canonical spellings are agreed once, in `reference/companies.json`:
  `Caterpillar`, `Komatsu`, `Sandvik`, `Epiroc`, `RCT Global`, `Rio Tinto`,
  `Hitachi Construction Machinery`, `Autonomous Solutions Inc.`, `Codelco`,
  `LKAB`, `PT Freeport Indonesia`, `Canadian Natural Resources`,
  `Impala Platinum`. No legal suffixes, except where the company trades
  under one (`Autonomous Solutions Inc.`, `PT Freeport Indonesia`).
- Chinese entities: `key` in pinyin, `name` the canonical romanised form,
  and the Hanzi name as an alias with `language: "zh"`.
- Site names must be unmistakably invented. Do not combine a real region
  with a mining noun ("Pilbara Iron", "Bowen Coal") — those are or resemble
  real operators.

### Aliases

Companies and sites may carry `aliases`: `[{ "alias", "language" }]`, with
`language` a BCP-47 tag (`en`, `zh`, `zh-Latn` for pinyin). An alias resolves
to exactly one entity, so aliases are unique across a table. Migration 001
has no alias tables yet; the loader validates the field now and writes it to
`company_alias` and `site_alias` as soon as those tables exist, so the data
is ready the day the migration lands.

### Unnamed machine models

`model_name: null` is the "a Caterpillar haul truck, model unknown" row. Add
one per manufacturer and machine type that a fixture needs; the database
keeps a single such row per pair.

### Technology products

Each product carries `automation_level` (or `null` while awaiting
administrator classification), `vendor_term` as the supplier publishes it,
and `level_basis`, the reasoning behind the level, backed by `source`.

## Validation

`db:seed` validates every file before touching the database and reports
every problem at once as `file / key / field / message`. Beyond field types
and enum values it checks: unknown fields, duplicate keys and natural keys,
duplicate aliases, unresolved references, a site whose region is in another
country, `quantity > 0`, a `verified` deployment without a technology
product, and `valid_to` before `valid_from`.

## Idempotency

Reference: a re-run is a no-op unless a row's data changed. Rows removed
from JSON are not deleted; reference data is never destructively synced.
Rename or remove a catalogue row with a migration.

Fixtures: a re-run produces an identical database, ids included, because the
load truncates and restarts identity. `company` is shared with the catalogue
and is upserted, never truncated. When migration 002 adds tables that
reference `site` or `deployment` (`evidence`, `revision`, ...), add them to
the truncate list in [`src/seed/fixtures.ts`](../src/seed/fixtures.ts).

## Tests

`src/seed/seed.test.ts` needs a migrated database at `DATABASE_URL`. It
loads the reference data and fixtures in `beforeAll`, checks that both
loaders are idempotent, that constraint violations are caught by validation,
and that the fixtures satisfy the coverage scenarios in seed-spec §8. When
you add fixture rows for a scenario, add its `it()` there.