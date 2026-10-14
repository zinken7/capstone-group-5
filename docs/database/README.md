# Database documents

| File | What it is |
|---|---|
| [`ERD.md`](ERD.md) | The logical data model. The project plan makes it normative for enumerations and constraints. |
| `synthetic_mining_seed.xlsx` | A readable copy of the demonstration data in [`backend/seeds/seed_global.sql`](../../backend/seeds/seed_global.sql), one sheet per table. |

## Synthetic seed workbook

- **The data is invented.**
  - It was generated with an AI tool from the column format of the client dataset (SRS DATA-1) and the ERD. Only that format was given to the tool, not client records.
  - The workbook holds no client data.
  - Evidence URLs use the reserved `.invalid` domain.
- **The SQL seed is the source of truth.**
  - The application loads only `seed_global.sql`, never this workbook.
  - If the two differ, the SQL wins; update the workbook when the seed's data changes.
- **Contents:** the same rows as the seed:
  - 25 companies, 40 regions, 40 sites, 40 site–company roles;
  - 100 machine models, 25 technology products;
  - 200 deployments (133 verified, 67 unverified) and 133 evidence records.
- **Known difference:** the workbook predates migration 005, so its deployment sheet has no `technology_supplier_id`. The seed takes each deployment's supplier from its technology product.
