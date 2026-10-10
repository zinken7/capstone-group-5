# Client Meeting 3

- **Project:** Autonomous Mining Equipment Market Map
- **Client:** Dr Adrian Boeing
- **Minutes source:** Client-meeting recording and bilingual transcript supplied by Shee Wang

| | |
|---|---|
| **Date** | Friday 18 September 2026 |
| **Format** | Online demonstration and requirements review |
| **Transcript coverage** | 14:03–15:00; the supplied recording is longer and should remain the primary source for any disputed wording |
| **Purpose** | Demonstrate Sprint 2 progress, validate the data model and confirm the MVP scope |
| **Reference code** | CM3 |

---

## 1. Data supplied by the client

- The client supplied a dataset based on real data.
- Commercially sensitive information was removed before sharing.
- Some company names were replaced with fictional names.
- Mine-site names were replaced with nearby towns so that the customer could not be inferred. The client considers town-based geocoding functionally equivalent for the MVP.
- The dataset is mainly Australian but also contains international records. The product should not be designed as Australia-only.
- A town name should be usable with a geocoding service to obtain a map location.

## 2. Data-model decisions

The client agreed with the central deployment model and identified the following information as important:

- site or region and geographic location;
- commodity and mine environment (surface, underground or both);
- machine manufacturer, base machine model, machine type and optional variant;
- quantity of machines;
- technology manufacturer/supplier and product;
- automation level;
- deployment or commissioning date and operating status;
- whether the technology was factory-installed or retrofitted; and
- evidence URL, contributor and administrator/reviewer information.

The factory-installed/retrofit field can be optional because it will not always be known. Generic machine descriptors should also remain optional where a field is not meaningful for a particular machine type.

The agreed automation model has four levels: line-of-sight remote, teleremote, semi-autonomous and autonomous. The terminology should remain consistent with the SRS and the vendor terms in the dataset.

## 3. Product and interface feedback

The client reviewed the four main product areas:

1. Map — site markers, deployment status and site detail.
2. Equipment Register — searchable records, filters and CSV export.
3. Analytics — headline market statistics.
4. Contribute — a controlled submission path for new records.

The most useful initial map filters are technology supplier and machine type. Company and operating status are also useful. The map should default to operational records, with decommissioned records available through an explicit option or date view.

The register should support keyword search, controlled inputs and column sorting. Analytics should initially focus on machine type, country, automation level and technology supplier. Public analytics must use verified records by default; unverified records may be included only through a clearly labelled option.

The likely audience includes industry partners and researchers, many of whom may be older or less comfortable with technology. The interface should therefore use readable text, clear controls and accessibility-conscious colour choices rather than relying on colour alone.

## 4. Verification workflow

- A complete deployment submission should be reviewed as one evidence-backed unit rather than assigning independent truth values to every field.
- The submission is either verified or unverified as a whole, with an administrator making the final decision.
- Evidence should initially be represented by public URLs. Direct image/PDF storage is not required for the MVP.
- Contributors should not be forced to create an account. An email field may be optional so that an administrator can follow up.
- Analytics must default to verified data; otherwise quantities and market shares could become misleading.
- The workflow must support an administrator correcting a submitted quantity or other field while retaining the original submission/revision history.

Conflicting submissions and the exact correction workflow still need to be made explicit in the SRS and tested in the prototype.

## 5. MVP boundary and deployment

- The MVP is a public-facing application that can run locally or on a public host.
- It does not need to be deployed directly to the UWA website during this project.
- A future handover may place the application on UWA hosting.
- Satellite imagery would help administrators visually check whether a claimed mine site exists, but it is a bonus feature and not required for MVP delivery.
- An AI assistant for administrator verification is a possible MVP 2 feature and must not displace the core MVP workflow.

## 6. Actions

| Action | Owner | Priority |
|---|---|:--:|
| Connect the Map, Equipment Register and Analytics views to the shared/live API | Frontend team / M5 | Must |
| Add or confirm retrofit, automation-level and evidence fields in the API/data mapping | Frontend/backend team | Must |
| Keep verified-only behaviour as the default for public views | Frontend/backend team | Must |
| Add loading, empty and API-error states to live-data pages | Frontend team | Must |
| Add controlled inputs and validation for contribution data | Frontend team | Should |
| Clarify correction, conflicting-submission and revision behaviour in the SRS | Team | Should |
| Prepare a near-final demonstration for the client and wider industry reviewers | Team / client | Should |
| Keep AI-assisted verification and satellite imagery outside the MVP unless core work is complete | Team | Boundary |

