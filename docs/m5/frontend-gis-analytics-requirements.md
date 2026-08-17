# M5 — Frontend, GIS and Analytics Requirements

**Owners:** Shee Wang (24368932), Hengan Weng (24201874)  
**Status:** Draft for team and client confirmation

## Purpose

This document translates the stakeholder feedback for the frontend, GIS and
analytics workstream into initial functional requirements, data dependencies
and open questions. It does not represent final client approval.

## Dashboard Requirements

The dashboard should provide:

- Sorting and filtering of relevant equipment data.
- Tooltips that explain chart values and metric definitions.
- Existing dashboard widgets should update dynamically when shared filters change.
- As a Could requirement, users may be able to customise the dashboard by
  adding, configuring and removing available widgets, and retain their selected
  arrangement between sessions, subject to client confirmation and team capacity.
- A time-range slicer based on the agreed deployment or commissioning date.
- Deployment or adoption counts over time.
- Manufacturer and technology-supplier market-share visualisations.
- Surface and underground equipment breakdown.
- Clear handling of loading, empty-data and error states.
- Responsive presentation on common desktop and mobile screen sizes.
- Shared filters that apply consistently to all relevant measures, including country, machine type, manufacturer, technology supplier, automation band, commodity and surface/underground classification.

## GIS Requirements

The GIS interface should provide:

- A map displaying equipment deployments permitted by the agreed publication and verification rules.
- Mine-site markers generated from geographic data supplied by the backend.
- Equipment details accessible from map markers.
- Filtering by equipment type, manufacturer, country and other agreed fields.
- Synchronisation between map results and active dashboard/data filters.
- Support for GeoJSON or another agreed API response format.
- Clear attribution for the selected base-map provider.

## Initial Analytics Definitions

The following definitions are proposed but require confirmation:

| Metric | Initial interpretation |
|---|---|
| Deployment count | Number of verified deployment records in the selected period |
| Equipment count | Sum of equipment quantities in verified deployment records |
| Manufacturer market share | Manufacturer equipment count divided by total equipment count for the selected filters |
| Technology supplier market share | Technology-supplier equipment count divided by total equipment count for the selected filters |
| Adoption trend | Verified equipment or deployment count grouped by commissioning year |
| Surface/underground split | Equipment count grouped by the deployment-level surface/underground classification | 

## Data Dependencies

The frontend, GIS and analytics components depend on the backend providing:

- Deployment identifier and equipment quantity
- Equipment type, manufacturer and model
- Technology supplier and technology product
- Automation level or derived automation band
- Deployment and verification status
- Country, region, commodity and mine-site information
- Mine-site geometry or coordinates derived from the PostGIS site location
- Commissioning date and deployment validity period
- Surface/underground classification
- Evidence information

These dependencies align with the proposed database ERD, where deployments
connect mine sites, machine models and technology products. The frontend API
contract, GeoJSON response structure and dashboard-layout persistence mechanism
still require coordination with the backend and database teams.

## Open Questions

The following points require team or client confirmation:

1. Is deployment rate measured using equipment units, deployment records or
   mine sites?
2. Is manufacturer market share calculated by equipment quantity or deployment
   records?
3. Which date field controls the time slicer?
4. Should user-configurable widgets be included in the MVP or retained as a
   Could feature under FR-36, and which widget operations and persistence
   behaviour are required?
5. Should unverified and rejected records ever appear in public analytics?
6. Which filters must update the dashboard, map and equipment table together?
7. What dataset will be used to validate the dashboard calculations?
8. What performance target applies when the registry contains thousands of
   records?
9. Are financial projections excluded from the MVP?

## Initial Acceptance Considerations

- Changing the selected time range updates all applicable dashboard metrics
  and charts.
- Chart tooltips display the metric value and sufficient context to interpret
  it.
- Manufacturer shares use a clearly stated denominator and total correctly.
- The map displays only records permitted by the agreed verification rules.
- Map and analytics results remain consistent when the same filters are used.
- Empty datasets show an explanatory message rather than a broken or blank
  component.
- Unknown classifications are shown separately where appropriate.
- The interface remains usable on desktop and mobile screen sizes.

## Scope Note

User-configurable and saved dashboard layouts are treated as a Could requirement
under FR-36 and will be implemented only if confirmed by the client and supported
by the project schedule. Financial forecasting and advanced predictive analytics
are not assumed to be part of the MVP without explicit approval and an agreed
data and validation approach.

