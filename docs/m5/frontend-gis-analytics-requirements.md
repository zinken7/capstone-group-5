# M5 — Frontend, GIS and Analytics Implementation Requirements

**Owners:** Shee Wang (24368932), Hengan Weng (24201874)  
**Status:** Working draft aligned with SRS v0.4

## Purpose

This document translates the current SRS into implementation-facing guidance
for the frontend, GIS and analytics workstream. The SRS remains the normative
requirements source; if this document and the SRS disagree, the SRS takes
precedence. This document records data dependencies, acceptance considerations
and coordination points, and does not claim final client approval.

## Dashboard Requirements

The analytics dashboard should provide:

- Headline counts for recorded automated machines, mine sites and countries
  (FR-21).
- Cumulative machines in service over time (FR-22).
- Machine counts by country and machine type (FR-23, FR-24).
- Technology-supplier and machine-manufacturer market-share visualisations
  (FR-25, FR-26).
- Shared filters for country, region, machine type, manufacturer, technology
  supplier, automation level, commodity and surface/underground operation,
  applying consistently to every measure (FR-27).
- Tooltips that explain chart values, units and metric definitions.
- Existing widgets that update when shared filters change.
- Clear loading, empty-data and error states.
- Keyboard-accessible controls, visible focus and sufficient contrast (NFR-01).
- A responsive layout that remains usable in the supported desktop browsers
  (NFR-02).

If scheduled, the Could requirement in FR-35 allows users to choose which
measures are displayed and retain that arrangement between sessions. It is not
part of the committed MVP unless the team explicitly takes it into a sprint.

## GIS Requirements

The GIS interface should provide:

- One marker per mine site at its geographic location (FR-15).
- Marker styling based on the most advanced deployment status at the site
  (FR-16).
- Site and deployment information accessible by selecting a marker (FR-17).
- Filtering by technology supplier (FR-18).
- A time control showing deployments in service at the selected date and the
  number excluded because their commissioning date is missing (FR-19).
- Further filters for country, region, machine type, automation level,
  commodity and surface/underground operation (FR-20).
- Synchronisation between map results and the active shared filters.
- A typed presentation boundary that does not hard-code API access into the
  reusable map component.
- Clear attribution and licensing for the selected base-map source.

The project plan proposes a GeoJSON endpoint for map markers. The exact API
response, bounding-box parameters and error format remain an interface contract
to be agreed with the backend and database teams.

## Analytics Definitions

| Metric | Implementation definition |
|---|---|
| Machine count | Sum of `deployment.quantity` over the filtered recorded deployments |
| Site count | Number of distinct mine sites represented by the filtered deployments |
| Country count | Number of distinct countries represented by the filtered deployments |
| Manufacturer market share | Machine count linked through machine model to each manufacturer, divided by the filtered machine total |
| Technology-supplier market share | Machine count linked through technology product to each supplier, divided by the filtered machine total |
| Cumulative machines in service | Machine quantity whose deployment validity includes the selected date |
| Automation-level share | Machine count grouped through technology product to its automation level, with unknown values shown separately |

Public views default to verified records, as required by FR-43. Any view that
allows another verification state must label that state clearly and must not
present unverified data as verified.

## Data Dependencies

The frontend, GIS and analytics components depend on the backend providing:

- Deployment identifier and equipment quantity
- Machine type, manufacturer, model, size class and payload where recorded
- Technology supplier, technology product and assigned automation level
- Deployment status and verification status
- Country, maintained region, commodity and mine-site information
- Mine-site point geometry or latitude and longitude
- Commissioning date and deployment valid-from and valid-to dates
- Surface/underground classification
- Evidence links where the interface displays verification context

These dependencies align with SRS v0.4 and `docs/database/ERD.md`, where a
deployment connects a mine site, machine model and optional technology product.
The frontend must treat optional fields as genuinely optional until a record is
verified, rather than replacing missing values with invented data.

## Backend and Database Coordination

The following points still require agreement with the backend and database
teams before live integration:

1. The marker API response shape, including GeoJSON properties or an agreed
   typed alternative.
2. Bounding-box, filter and historical-date query parameters.
3. Error, loading, empty-result and pagination behaviour.
4. Whether filter options are returned by dedicated endpoints or derived from
   result metadata.
5. The dataset used to validate counts, shares and historical calculations.
6. A measurable response-time target for larger datasets.
7. The persistence mechanism if FR-35 is scheduled.

## Initial Acceptance Considerations

- Changing a shared analytics filter updates every applicable measure and chart.
- Chart tooltips identify the metric, value, unit and active context.
- Market shares use machine quantity as the denominator and total correctly for
  the selected filters.
- Changing the map date updates the displayed markers and states how many
  records were excluded because no commissioning date was recorded.
- Public map and analytics views default to verified records.
- Map and analytics results remain consistent when the same filters are used.
- Empty datasets show an explanatory message rather than a broken component.
- Unknown classifications are shown separately rather than silently discarded.
- Interactive controls support keyboard operation and visible focus.
- The interface remains usable in current desktop Chrome and Edge.

## Implementation Status

- The reusable React/TypeScript and Leaflet map foundation was merged in PR
  #30, using typed fixture data and no backend dependency.
- Live marker data, marker status styling, site details, shared filters and the
  historical time control remain integration work under the map issues.
- Analytics implementation remains scheduled for Sprints 2–3 in
  `docs/project_plan.md`.

## Scope Note

User-selected and saved dashboard layouts are a Could requirement under FR-35
and will be implemented only if scheduled by the team. Financial forecasting,
advanced predictive analytics and satellite or aerial imagery are outside the
current release unless the SRS is explicitly amended.
