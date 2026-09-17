# Global development seed

This dataset is intended for development and testing only. Most records originate from real-world public information, but some details are unclear or disputed. Treat the entire dataset as synthetic development seed data, NOT verified industry data. The records are not wholly fictional. All deployments have `verification_status = 'unverified'`.

The package contains `seed_global.sql` and this README.

## Run

Apply the project's initial migration to a development database first. This seed targets the supplied `001_initial_schema.sql`; compatibility with the current `main` branch has not been checked. PostgreSQL, PostGIS and the `psql` client are required.

Place both files in `docs/database/seeds/`. Set `DATABASE_URL` to your development database connection string, then run from the repository root.

Bash:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f docs/database/seeds/seed_global.sql
```

PowerShell:

```powershell
psql "$env:DATABASE_URL" -X -v ON_ERROR_STOP=1 -f docs/database/seeds/seed_global.sql
```

## Records

| Table | Seed rows |
| --- | ---: |
| company | 18 |
| region | 5 |
| site | 9 |
| site_company_role | 18 |
| machine_model | 11 |
| technology_product | 7 |
| deployment | 11 |
| Total | 79 |

The seed inserts into seven existing tables. It does not create or alter persistent schema objects. Temporary staging tables are dropped when the transaction commits.

## Repeat behaviour

The workflow is deterministic. Existing identical seed records are skipped. Conflicting records cause the transaction to fail and roll back. The only permitted update is to fill a NULL coordinate on one of the nine legacy seed sites when every other field exactly matches the seed. Existing non-NULL coordinates and all other conflicting values cause a rollback. No records are deleted or truncated.

The seed reserves negative IDs from `-917001` through `-917099` in each target table. These IDs do not advance the normal positive identity sequences. If the application requires positive IDs, agree on a replacement ID range before using this seed.

Seed metadata timestamps are fixed at `2026-09-17 00:00:00 UTC`; they are not real-world event dates. Unknown values remain SQL `NULL`.

## Expected development results

The nine sites cover China (3), Australia (4), Sweden (1) and Canada (1). The eleven deployments include ten operational records and one announced record, with nine surface and two underground records. Deployment quantities sum to 288. This is a test control total, not an industry statistic.

## Limitations and validation

All nine sites now have approximate administrative-centre coordinates for map development. These support marker and clustering tests, but not accurate mine-distance or mine-boundary analysis. Automation levels are limited to autonomous and unknown values. All deployment `valid_to` values are `NULL`, so historical and time-series coverage is incomplete. This package does not satisfy every seed acceptance criterion on its own.

Static checks covered required fields, foreign-key references, uniqueness, enum values, quantities, region consistency and date ordering. The previous version was validated in the project's Docker Compose database: the initial migration, first seed load and repeat load completed without errors, with 79 records and no duplicate inserts. The coordinate update has been checked statically; its database execution must still be verified.

## Approximate map coordinates

All coordinates use longitude, latitude order and SRID 4326. The sites use local-government administrative centres as practical counterparts, not identical administrative ranks, there may have more than one sites in one local goverment region. Ordos uses its Kangbashi administrative centre. These are development placeholders, not surveyed mine locations or calculated area centroids.

| Site | Representative area / centre | Longitude | Latitude |
| --- | --- | ---: | ---: |
| Nan (South) Opencast Coal Mine | Tongliao | 122.243 | 43.654 |
| Anjialing Opencast Coal Mine | Shuozhou | 112.4329 | 39.3317 |
| Heidaigou Opencast Coal Mine | Ordos (Kangbashi administrative centre) | 109.791 | 39.597 |
| Gudai-Darri Mine | East Pilbara (Newman) | 119.732 | -23.354 |
| South Flank Mine | East Pilbara (Newman) | 119.732 | -23.354 |
| Solomon Kings Mine | Ashburton (Tom Price) | 117.795 | -22.69389 |
| Kiruna Mine | Kiruna Municipality (Kiruna) | 20.30278 | 67.84889 |
| Fort Hills Mine | Wood Buffalo (Fort McMurray) | -111.38028 | 56.72639 |
| Yandicoogina Mine | East Pilbara (Newman) | 119.732 | -23.354 |

There are nine located sites and seven distinct map points. Gudai-Darri, South Flank and Yandicoogina intentionally share the Newman point; markers may overlap or form a cluster. Do not add random offsets to the stored coordinates.

## Docker workflow (PowerShell)

Run from the repository root after the database is healthy and the initial migration has completed:

```powershell
docker compose cp ./docs/database/seeds/seed_global.sql db:/tmp/seed_global.sql
docker compose exec -T db sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -X -v ON_ERROR_STOP=1 -f /tmp/seed_global.sql'
```

This works for both a freshly migrated database and the unchanged previous seed with NULL coordinates. The latter should report `UPDATE 9` on its first upgrade, followed by `UPDATE 0` on repeat loads. A fresh database reports `UPDATE 0` and inserts the nine sites. Expected final totals remain 79 records, with `sites_with_coordinates = 9` and `distinct_map_points = 7`.
