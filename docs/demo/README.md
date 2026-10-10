# Sprint 2 UI review snapshots

These screenshots were captured from the local frontend against the live project API on 20 September 2026.

## Sprint 3 live smoke check

On 5 October 2026 the deployed Map, Equipment Register, Analytics,
Contribution and Administrator routes each returned HTTP 200. The backend
`/health` and `/health/database` checks also returned HTTP 200.

The deployed API reported:

- 27 mapped sites with no excluded records;
- 133 verified register records and 1,639 machines;
- 27 sites across 7 countries in Analytics; and
- matching totals between the Map, Register and Analytics endpoints.

These values come from the deterministic synthetic demonstration seed and are
release-test evidence, not estimates of the complete global market. The final
authenticated submit/review/public walkthrough remains listed in the Sprint 3
QA checklist.

## Map

The map defaults to operational records, provides an explicit decommissioned-record option, and uses a quantity-density halo without using colour to encode operating status.

![Map with quantity density](map.png)

## Equipment Register

The register uses keyword search, supplier/status/year filters, Australian-format commissioning dates, CSV export, and sortable table headers.

![Equipment Register with sortable headers](equipment.png)

## Analytics

The analytics page shows verified headline counts plus breakdowns by machine type, country, automation level, and technology supplier.

![Analytics dashboard](analytics.png)
