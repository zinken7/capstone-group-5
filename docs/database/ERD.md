# Database Entity Relationship Diagram

## Purpose and scope

This is the proposed logical data model for the Autonomous Mining Equipment
Market Map.  It implements the MVP data requirements in SRS v0.4: FR-01 to
FR-11 as committed scope, with FR-12 to FR-14 intended.  In particular it holds
the manufacturer of a machine and the supplier of its automation technology as
separate values.

A **deployment** is the central business record: a quantity of one machine
model, at one mine site, using one automation technology product, for a stated
period.  A deployment represents a fleet where individual serial numbers are
not available.

## Logical ER diagram

```mermaid
erDiagram
    COMPANY ||--o{ SITE_COMPANY_ROLE : "holds a role at"
    REGION o|--o{ SITE : contains
    SITE ||--o{ SITE_COMPANY_ROLE : "has"
    COMPANY ||--o{ MACHINE_MODEL : manufactures
    COMPANY ||--o{ TECHNOLOGY_PRODUCT : supplies
    SITE ||--o{ DEPLOYMENT : hosts
    MACHINE_MODEL ||--o{ DEPLOYMENT : "is deployed as"
    TECHNOLOGY_PRODUCT o|--o{ DEPLOYMENT : "automates"
    DEPLOYMENT ||--o{ EVIDENCE : "is supported by"
    DEPLOYMENT ||--o{ REVISION : "has history"
    CONTRIBUTOR o|--o{ REVISION : makes
    ADMIN_USER o|--o{ REVISION : edits
    DEPLOYMENT ||--o{ VERIFICATION_REVIEW : "is reviewed through"
    ADMIN_USER ||--o{ VERIFICATION_REVIEW : performs

    COMPANY {
        bigint id PK
        text name UK
        text country_code
        timestamptz created_at
    }
    REGION {
        bigint id PK
        text name
        text country_code
    }
    SITE {
        bigint id PK
        text name
        text country_code
        bigint region_id FK "nullable"
        text commodity
        site_status mine_status
        geometry point_4326
    }
    SITE_COMPANY_ROLE {
        bigint id PK
        bigint site_id FK
        bigint company_id FK
        company_role role
    }
    MACHINE_MODEL {
        bigint id PK
        bigint manufacturer_id FK
        text model_name "nullable"
        machine_type machine_type
        text size_class
        numeric max_payload_tonnes
        numeric operating_weight_tonnes
    }
    TECHNOLOGY_PRODUCT {
        bigint id PK
        bigint supplier_id FK
        text product_name
        text vendor_term
        automation_level automation_level "nullable"
        text level_basis
    }
    DEPLOYMENT {
        bigint id PK
        bigint site_id FK
        bigint machine_model_id FK
        bigint technology_product_id FK "nullable until verification"
        integer quantity
        mining_environment environment
        date commissioning_date
        deployment_status status
        verification_status verification_status
        date valid_from
        date valid_to
        timestamptz created_at
        timestamptz updated_at
    }
    EVIDENCE {
        bigint id PK
        bigint deployment_id FK
        text url
        evidence_type source_type
        text publisher
        date published_date
    }
    CONTRIBUTOR {
        bigint id PK
        text display_name "nullable"
        text email "nullable"
        text organisation "nullable"
        timestamptz created_at
    }
    ADMIN_USER {
        bigint id PK
        text email UK
        text password_hash
        boolean active
        timestamptz created_at
    }
    VERIFICATION_REVIEW {
        bigint id PK
        bigint deployment_id FK
        bigint admin_user_id FK
        verification_decision decision
        text review_note
        timestamptz reviewed_at
    }
    REVISION {
        bigint id PK
        bigint deployment_id FK
        bigint contributor_id FK "nullable"
        bigint admin_user_id FK "nullable"
        revision_action action
        jsonb previous_values
        text change_note
        timestamptz changed_at
    }
```

This diagram is the single maintained copy.  SRS Section 5.1 shows a rendered
image of it rather than a second copy of the source.  Regenerate the image
whenever the diagram changes:

    awk '/^```mermaid/{f=1;next} f&&/^```/{exit} f' docs/database/ERD.md > /tmp/erd.mmd
    mmdc -i /tmp/erd.mmd -o docs/images/erd.png -b white -w 2400 -s 2

## Relationship rules

| Relationship | Cardinality | Rule |
|---|---:|---|
| Region–site | 0..1:N | A site may sit in a named region, or in none.  Regions are reference data so that grouping and filtering resolve to one value (FR-12). |
| Company–machine model | 1:N | A model has one manufacturer; a company may manufacture many models. |
| Company–technology product | 1:N | A product has one supplier; the supplier may also be a machine manufacturer. |
| Site–company role | M:N | A site can have owners, operators and contractors.  The association table records the role. |
| Site–deployment | 1:N | Each deployment belongs to one mine site. |
| Machine model–deployment | 1:N | A model may occur in many deployments.  The model name may be unknown initially. |
| Technology product–deployment | 0..1:N | A submission may initially omit the product, but it is required before verification. |
| Deployment–evidence | 1:0..N | A deployment may initially have no evidence; verified deployments require at least one evidence record (see integrity constraints). |
| Deployment–verification review | 1:N | Every verification decision is retained as a separate, append-only review record. |
| Admin user–verification review | 1:N | Each review is performed by one administrator; an administrator may perform many reviews. |
| Deployment–revision | 1:N | Changes are append-only; the deployment row is the current state and revisions provide an audit trail.  A revision may be made by a contributor or by an admin user. |

## Controlled values

The following should be PostgreSQL enums or lookup tables, not unconstrained
free text:

| Field | Values |
|---|---|
| `company_role` | `owner`, `operator`, `contractor` |
| `site_status` | `operating`, `commissioning`|
| `machine_type` | `haul_truck`, `lhd`, `loader`, `dozer`, `excavator`, `drill`, `scaler`, `shotcrete_machine`, `other` |
| `automation_level` | `line_of_sight_remote`, `teleremote`, `semi_autonomous`, `autonomous` |
| `mining_environment` | `surface`, `underground`, `both` |
| `deployment_status` | `announced`, `commissioning`, `operational`, `decommissioned` |
| `verification_status` | `unverified`, `pending_review`, `verified`, `rejected` |
| `verification_decision` | `approved`, `rejected`, `needs_changes` |
| `evidence_type` | `company_release`, `news`, `academic`, `government`, `report`, `other` |

## Integrity constraints and indexes

* `quantity > 0`; latitude/longitude are not duplicated when `point_4326` is
  used.  If PostGIS is unavailable, `point_4326` is replaced by latitude and
  longitude columns, which serve the point rendering and bounding-box queries
  the map requires.
* `valid_to` must be on or after `valid_from`; a relocation closes one
  deployment and creates another.
* A verified deployment requires a technology product and at least one evidence
  record.  Enforce this in the application transaction or a database trigger.
* A verification review must reference an active administrator. Review records
  are append-only; `verification_status` represents the current verification
  state and is updated transactionally when a review decision changes it.
* `admin_user.email` is unique. Store only a strong password hash (for example,
  Argon2id or bcrypt), never a plaintext password.
* `contributor` holds only an email address and, where offered, an organisation
  (NFR-09).  No domain-affiliation flag is held in the MVP; one arrives only if
  FR-52 and FR-53 are taken up.
* `region` is unique on `(name, country_code)`.
* A site's country must match its region's country.  Enforce with a unique
  constraint on `region(id, country_code)` and a composite foreign key from
  `site` on `(region_id, country_code)`, or with a trigger.
* `site_company_role` is unique on `(site_id, company_id, role)`.
* `machine_model` is unique on `(manufacturer_id, model_name)` where
  `model_name` is not null.
* Add B-tree indexes for deployment filters: `site_id`, `machine_model_id`,
  `technology_product_id`, `verification_status`, `status`,
  `commissioning_date`, and the site `country_code` and `region_id`.
* Add B-tree indexes on `verification_review(deployment_id, reviewed_at)` and
  `verification_review(admin_user_id)` to support review history and audit
  queries.
* Add a GiST index on `site.point_4326` for viewport and radius queries.
* Store source URLs as text and optionally add a unique index on
  `(deployment_id, url)` to prevent duplicate evidence.

## Deliberate exclusions for the MVP

Machine serial numbers, ownership percentages, sensor-level details, raw
uploaded media and market-event feeds are not required by the MVP.  They can be
added later without changing the central deployment relationship.
