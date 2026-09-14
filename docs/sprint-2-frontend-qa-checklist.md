# Sprint 2 Frontend QA Checklist

## Purpose

This checklist records the Sprint 2 frontend quality checks for the application shell, Map, Equipment Register and Analytics interfaces.

It is intended to support regression testing during integration and final staging verification.

---

## Automated Testing

- [x] Application shell and primary navigation render correctly.
- [x] Navigation to the Equipment Register is covered by an automated test.
- [x] Navigation to Analytics is covered by an automated test.
- [x] Keyboard navigation through the main navigation is covered.
- [x] Map page rendering is covered.
- [x] Map supplier filtering is covered.
- [x] Map empty-state behaviour is covered.
- [x] Equipment Register rendering and controls are covered.
- [x] Equipment search interaction is covered.
- [x] Equipment empty-state behaviour is covered.
- [x] Analytics headline metrics and breakdowns are covered.
- [x] Analytics empty-state behaviour is covered.
- [x] Existing frontend API tests continue to pass.

Automated test result:

- 7 test files passed.
- 36 tests passed.

---

## Accessibility and Keyboard Checks

- [x] Primary navigation has an accessible navigation label.
- [x] Main navigation links can be reached using the Tab key.
- [x] Navigation links can be activated using the keyboard.
- [x] Visible focus indication is present on navigation links.
- [x] Map supplier filter has a visible label.
- [x] Equipment search control has a visible label.
- [x] Supplier, status and sort controls have visible labels.
- [x] Equipment controls can be reached using keyboard navigation.
- [x] Focus indication is visible on Equipment Register controls.
- [x] Dynamic result counts use an `aria-live` region.
- [x] Equipment table is exposed as a labelled scrollable region.

---

## Map QA

- [x] Map page loads successfully.
- [x] Map markers are displayed.
- [x] Deployment status legend is displayed.
- [x] Supplier filter can be used to filter displayed sites.
- [x] Number of displayed sites updates after filtering.
- [x] No-match supplier search displays an empty-state message.
- [x] Map controls remain visible and usable.
- [ ] Historical date behaviour to be rechecked when live historical data integration is available.
- [ ] Site-detail behaviour to be regression tested after final live API integration.

---

## Equipment Register QA

- [x] Equipment Register loads successfully.
- [x] Equipment records are displayed in a readable table.
- [x] Search control is available and functional.
- [x] Supplier filter is available.
- [x] Status filter is available.
- [x] Sort control is available.
- [x] Export CSV control is available.
- [x] Record count is displayed.
- [x] Empty search/filter results display an appropriate message.
- [x] Table remains understandable at the desktop demo viewport.
- [x] Table remains usable at a smaller viewport using horizontal scrolling.
- [x] Filter controls remain usable at a smaller viewport.

---

## Analytics QA

- [x] Analytics page loads successfully.
- [x] Headline machine count is displayed.
- [x] Mine-site count is displayed.
- [x] Country count is displayed.
- [x] Machine-by-type breakdown is displayed.
- [x] Machine-by-country breakdown is displayed.
- [x] Empty analytics data is covered by automated testing.
- [ ] Analytics values to be regression checked against live API data after final integration.

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
- [ ] Live API loading state to be regression checked after final integration.
- [ ] Live API error state to be regression checked after final integration.

---

## Quality Commands

The following frontend quality commands were run successfully:

```text
npm.cmd test
7 test files passed
36 tests passed

npm.cmd run typecheck
Passed

npm.cmd run lint
Passed with zero warnings

npm.cmd run build
Production build completed successfully