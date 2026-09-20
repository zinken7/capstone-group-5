# Sprint 2 Frontend QA Checklist

## Purpose

This checklist records the Sprint 2 frontend quality checks for the application shell, Map, Equipment Register and Analytics interfaces.

It was updated after Client Meeting 3 on 18 September 2026 and after the live API integration. It records the current UI decisions rather than the earlier prototype behaviour.

**Current review branch:** `feature/41-live-frontend-api`

**Current review PR:** #59

**Last reviewed:** 20 September 2026

---

## Automated Testing

- [x] Application shell and primary navigation render correctly.
- [x] Navigation to the Equipment Register is covered by an automated test.
- [x] Navigation to Analytics is covered by an automated test.
- [x] Keyboard navigation through the main navigation is covered.
- [x] Map page rendering is covered.
- [x] Map supplier and machine-type filtering are covered.
- [x] Map operational/decommissioned filtering is covered.
- [x] Map empty-state behaviour is covered.
- [x] Australian date formatting and parsing are covered.
- [x] Map query serialisation, site-detail mapping and API error handling are covered.
- [x] Equipment Register rendering and controls are covered.
- [x] Equipment search, supplier/status filters and commissioning-year filtering are covered.
- [x] Equipment header sorting is covered.
- [x] Equipment empty-state behaviour is covered.
- [x] Analytics headline metrics and all four breakdowns are covered.
- [x] Analytics empty-state behaviour is covered.
- [x] Existing frontend API tests continue to pass.

Automated test result:

- 8 test files passed.
- 41 tests passed.

---

## Accessibility and Keyboard Checks

- [x] Primary navigation has an accessible navigation label.
- [x] Main navigation links can be reached using the Tab key.
- [x] Navigation links can be activated using the keyboard.
- [x] Visible focus indication is present on navigation links.
- [x] Map supplier, machine-type and date controls have visible labels.
- [x] Map decommissioned-record and quantity-density controls have visible labels.
- [x] Deployment status is available as readable text in site details and is not communicated by colour alone.
- [x] The machine-quantity density guide explains that colour represents quantity, not operating status.
- [x] Equipment search, supplier, status and commissioning-year controls have visible labels.
- [x] Equipment table sort buttons have accessible labels and `aria-sort` state.
- [x] Equipment controls can be reached using keyboard navigation.
- [x] Focus indication is visible on Equipment Register controls.
- [x] Dynamic result counts use an `aria-live` region.
- [x] Equipment table is exposed as a labelled scrollable region.

---

## Map QA

- [x] Map page loads successfully from the live API.
- [x] Map markers are displayed for live site records.
- [x] Operational records are shown by default.
- [x] Decommissioned records can be included using an explicit checkbox.
- [x] A machine-quantity density guide is displayed when density is enabled.
- [x] Status colour encoding and the old deployment-status legend are not used, as decided in Client Meeting 3.
- [x] Supplier and machine-type filters can be used to filter displayed sites.
- [x] The number of displayed sites updates after filtering.
- [x] No-match supplier or machine-type searches display an empty-state message.
- [x] Map controls remain visible and usable.
- [x] The date control accepts the Australian `DD/MM/YYYY` format.
- [x] Date queries use deployment validity dates, so historical records can be shown regardless of their current status.
- [x] Site details display machine, supplier, quantity and readable deployment status.
- [x] A visible locations summary provides a non-map alternative for reviewing displayed sites.
- [x] Live loading and API-error states are implemented.

Follow-up for final staging:

- [ ] Repeat the historical-date check against an expanded live dataset containing multiple valid-from/valid-to periods.
- [ ] Repeat the site-detail check with the final staging API and production-like records.

---

## Equipment Register QA

- [x] Equipment Register loads successfully from the live API.
- [x] Equipment records are displayed in a readable table.
- [x] Search control is available and functional.
- [x] Supplier filter is available.
- [x] Status filter is available.
- [x] Commissioning-year filter is available.
- [x] Sortable table headers use visible up/down arrows instead of a separate `Sort by` dropdown.
- [x] Sort buttons expose their current direction through accessible labels and `aria-sort`.
- [x] Commissioning dates are displayed in Australian `DD/MM/YYYY` format.
- [x] Export CSV control is available.
- [x] Record count is displayed and updates after filtering.
- [x] Empty search/filter results display an appropriate message.
- [x] Loading and API-error states are implemented.
- [x] Table remains understandable at the desktop demo viewport.
- [x] Table remains usable at a smaller viewport using horizontal scrolling.
- [x] Filter controls remain usable at a smaller viewport.

---

## Analytics QA

- [x] Analytics page loads successfully from verified live API data.
- [x] Headline machine count is displayed.
- [x] Mine-site count is displayed.
- [x] Country count is displayed.
- [x] Machine-by-type breakdown is displayed.
- [x] Machine-by-country breakdown is displayed.
- [x] Machine-by-automation-level breakdown is displayed.
- [x] Machine-by-technology-supplier breakdown is displayed.
- [x] Public analytics use verified records by default.
- [x] Empty analytics data is covered by automated testing.
- [x] Loading and API-error states are implemented.

Follow-up for final staging:

- [ ] Reconcile Analytics values against the final live API dataset and approved seed totals.

---

## Responsive QA

Desktop and smaller viewport layouts were manually checked.

- [x] Main navigation remains usable.
- [x] Map page remains readable.
- [x] Equipment Register remains readable.
- [x] Equipment filter controls adapt to the available width.
- [x] Equipment table provides horizontal scrolling where required.
- [x] No critical control overlap was observed.
- [x] Core content remains accessible at smaller viewport sizes.

---

## Data States

- [x] Map empty state is covered.
- [x] Equipment Register empty state is covered.
- [x] Analytics empty state is covered.
- [x] Live API loading states are implemented for Map, Equipment Register and Analytics.
- [x] Live API error states are implemented for Map, Equipment Register and Analytics.
- [x] HTTP and network-error handling is covered by frontend API tests.

Follow-up for final staging:

- [ ] Repeat the loading and error checks with the final deployed API environment.

---

## Dataset and Submission Readiness

- [x] The current public API uses documented in-memory seed data from `backend/src/data/sites.ts`.
- [x] Public Map, Equipment Register and Analytics views exclude the pending-review deployment by default.
- [x] Frontend fixtures are clearly used for automated UI tests and are not presented as the client dataset.
- [ ] A separate client-supplied dataset file is not currently present in this repository.
- [ ] Do not replace the demo seed data with client records until the final de-identified export and publication permission have been received.
- [ ] Reconcile final analytics totals against the approved dataset before describing them as market totals.

The 18 September meeting minutes record that the client supplied data based on real records, with sensitive information removed and some names replaced. The actual client dataset was not included in the current repository or the available project files, so the current records are suitable for testing and demonstration only, not as evidence of complete market coverage.

---

## Quality Commands

The following frontend quality commands were run successfully on the current integration branch:

```text
npm test
8 test files passed
41 tests passed

npm run typecheck
Passed

npm run lint
Passed with zero warnings

npm run build
Production build completed successfully
```

The PR CI also passed the backend checks and database tests: 10 tests passed.
