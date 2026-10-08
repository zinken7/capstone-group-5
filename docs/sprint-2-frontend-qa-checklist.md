# Sprint 3 Frontend Accessibility and Release QA Checklist

## Purpose

This checklist records the release checks for the current public and administrator workflows. It replaces the earlier Sprint 2 snapshot while keeping the same file path so existing links remain valid.

**Review branch used for this check:** `fix/159-frontend-gaps`

**Release gate:** #70
**Accessibility evidence:** #160

**Last reviewed:** 7 October 2026

The checks below cover source inspection, unit tests, automated Playwright accessibility scans and existing responsive browser tests. Items under “Final deployed checks” still need to be repeated against the deployed environment because local tests cannot prove the state of the hosted API or database.

---

## Automated Evidence

- [x] Application shell and route navigation are covered. **Method:** unit tests.
- [x] Keyboard navigation through the primary navigation is covered. **Method:** unit tests.
- [x] The skip link and focusable main-content target are covered. **Method:** unit tests and source inspection.
- [x] Map filtering, historical year selection, site details, focus return, loading, error and empty states are covered. **Method:** unit tests.
- [x] Equipment filtering, sorting, pagination, CSV export and URL state are covered. **Method:** unit tests.
- [x] The public correction dialog and submission path are covered. **Method:** unit tests.
- [x] Analytics API-backed cards, shared filters, accessible table view, empty state and error state are covered. **Method:** unit tests.
- [x] Contribution form validation, reference-data loading, disclosure and submission states are covered. **Method:** unit tests.
- [x] Administrator sign-in, forced password change, queue, record review, correction, decision and account-management paths are covered. **Method:** unit tests.
- [x] axe-core Playwright scans cover Map, Equipment, Analytics, Contribute, Admin Login, Review Queue, Deployment Review, Admin Users and Admin Password Change; all 9 pages have no unexplained serious or critical violations. **Method:** automated axe scan with Playwright.

Full frontend run on 6 October 2026:

```text
25 test files passed
181 tests passed
```

Local accessibility scan on 6 October 2026:

```text
9 Playwright accessibility tests passed
0 unexplained serious or critical axe violations
```

The axe scan runs against the local Vite application. It provides automated accessibility evidence for the main public and administrator interfaces but does not replace the final deployed-environment scan below.

---

## WCAG 2.1 AA Checks (NFR-01)

### Keyboard operation and focus

- [x] A visible “Skip to main content” link bypasses the repeated header and primary navigation. **Method:** unit tests and source inspection.
- [x] Primary and administrator navigation use labelled `nav` landmarks and native links. **Method:** unit tests, source inspection and automated axe scan.
- [x] Buttons, links, inputs, selects and text areas have visible focus styling. **Method:** source inspection and manual browser testing.
- [x] Map filters and the site list can be operated without using the graphical markers. **Method:** unit tests and source inspection.
- [x] Selecting a site moves focus to the site-detail heading; closing the card returns focus to the corresponding site button. **Method:** unit tests.
- [x] Collapsing or reopening the map panel moves focus to the replacement toggle. **Method:** unit tests.
- [x] The public correction dialog receives focus, contains Tab focus, closes with Escape and restores focus to its opener. **Method:** unit tests.
- [x] Equipment sort controls are buttons with `aria-sort` and descriptive accessible names. **Method:** unit tests and automated axe scan.
- [x] The horizontally scrollable equipment table is a labelled keyboard-focusable region. **Method:** unit tests and source inspection.

### Labels, names and status messages

- [x] Public contribution, correction and filtering controls have visible labels. **Method:** unit tests and automated axe scan.
- [x] Contribution and correction field errors use `aria-invalid` and `aria-describedby` where field-specific feedback is available. **Method:** unit tests and source inspection.
- [x] Form and API failures use alert semantics; loading, success and result updates use status or live-region semantics. **Method:** unit tests and source inspection.
- [x] Icon-only map controls have accessible names, including distinct “Full screen” and “Exit full screen” states. **Method:** unit tests and automated axe scan.
- [x] Tables use headers and captions where the surrounding heading does not already provide the table name. **Method:** unit tests, source inspection and automated axe scan.
- [x] Analytics charts expose a text description and can be changed to a data table. **Method:** unit tests.

### Contrast and use of colour

- [x] Main text colours meet the 4.5:1 normal-text contrast threshold on white. **Method:** contrast check.
- [x] The focus colour (`#2563eb`) has 5.17:1 contrast on white. **Method:** contrast check.
- [x] Interactive control borders use `#748094`, which has 3.99:1 contrast on white. **Method:** contrast check.
- [x] Deployment and verification states are written as text and are not communicated by colour alone. **Method:** unit tests and source inspection.
- [x] Map status does not rely on colour alone: commissioning markers use a dashed outline, the site list and map tooltip state the status in text, the legend names each status, and the selected site’s deployment list states each status. **Method:** unit test and source inspection.
- [x] Analytics values and status totals are available as text as well as colour-coded graphics. **Method:** unit tests.

---

## Public Workflow QA

### Map

- [x] Verified site records load from the API. **Method:** unit tests.
- [x] Supplier, machine type, country, automation, region, commodity and environment filters are labelled. **Method:** unit tests and automated axe scan.
- [x] Decommissioned deployments are included only when explicitly selected. **Method:** unit tests.
- [x] The year slider states the year represented by the map and reports records excluded for missing commissioning years. **Method:** unit tests.
- [x] The sidebar site list provides a non-map route to the same site details. **Method:** unit tests and source inspection.
- [x] Marker status is distinguishable without colour through status text and marker styling; machine-count size is explained by a visible legend. **Method:** unit test and source inspection.
- [x] Loading, retry and no-result states are present. **Method:** unit tests.

### Equipment Register and corrections

- [x] Only verified public records are shown. **Method:** unit tests.
- [x] Filtering, server-side sorting and pagination update the result summary and URL state. **Method:** unit tests.
- [x] Table status cells include readable status text. **Method:** unit tests and source inspection.
- [x] CSV export is available for the filtered result. **Method:** unit tests.
- [x] A correction can be proposed from a record without exposing administrator controls. **Method:** unit tests.
- [x] The correction dialog explains that the proposed changes await review while the existing verified record remains public and unchanged. **Method:** unit tests.

### Analytics

- [x] Summary, breakdown and timeline data use the same filter state. **Method:** unit tests.
- [x] Each chart has loading, error and empty states. **Method:** unit tests.
- [x] Chart values include names, quantities and percentages in text. **Method:** unit tests.
- [x] Every chart card can show an accessible table alternative. **Method:** unit tests and automated axe scan.
- [x] The page states that public analytics contain verified records only. **Method:** unit tests.

### Contribution

- [x] Required fields and disclosure are identified in text. **Method:** unit tests and automated axe scan.
- [x] Validation feedback identifies the affected field. **Method:** unit tests.
- [x] Reference-data failure, submitting, API failure and success states are presented clearly. **Method:** unit tests.
- [x] A successful submission explains its review status instead of implying immediate publication. **Method:** unit tests.

---

## Administrator Workflow QA

- [x] Signed-out users are routed to the labelled administrator sign-in form. **Method:** unit tests and automated axe scan.
- [x] Temporary-password users must choose a new password before reaching review functions. **Method:** unit tests and automated axe scan.
- [x] The review queue identifies submissions and corrections, missing evidence and missing technology data in text. **Method:** unit tests and automated axe scan.
- [x] Review links include the site and record id in their accessible names. **Method:** unit tests.
- [x] Record details include evidence, current verification status and revision history. **Method:** unit tests and automated axe scan.
- [x] Approve, needs-changes and reject options include a short description of their outcome. **Method:** unit tests.
- [x] A note is required for needs-changes and rejection decisions. **Method:** unit tests.
- [x] Decision and correction failures are announced as alerts. **Method:** unit tests.
- [x] Root administrator account actions have account-specific accessible names and text status. **Method:** unit tests and automated axe scan.

---

## Responsive and Data-State QA

- [x] Primary navigation remains usable at smaller desktop widths. **Method:** Playwright responsive browser tests at 320 px and 390 px widths.
- [x] The map panel stacks above the map on narrow screens. **Method:** responsive CSS/source inspection.
- [x] Equipment and administrator tables retain horizontal scrolling when required. **Method:** responsive CSS/source inspection.
- [x] Form grids collapse without hiding labels or actions. **Method:** responsive CSS/source inspection.
- [x] Public Map, Equipment and Analytics views have loading, error and empty states. **Method:** unit tests.
- [x] Contribution and administrator workflows have API-error feedback. **Method:** unit tests.
- [x] Frontend fixtures are used only by tests and are not presented as client data. **Method:** source inspection.

---

## Final Deployed Checks

The authenticated contribution → administrator approval → public Equipment
Register walkthrough is recorded in
[`release-qa-evidence-2026-10-06.md`](../release-qa-evidence-2026-10-06.md).
It proves the pending-review confirmation, approval and public register result
for the labelled release-QA record. The Map/Analytics result, rejection and
correction paths, migration/seed output and deployed accessibility scan still
need their own evidence before these checklist items can be marked complete.

- [ ] Complete one deployment submission, approve it in the administrator queue, and confirm that it appears in the public Map, Register and Analytics views. **Method:** deployed manual workflow check.
- [ ] Complete one rejection or needs-changes decision and confirm that the record remains absent from public views. **Method:** deployed manual workflow check.
- [ ] Submit and review one correction, confirming that the verified record stays public and unchanged while the proposal is pending, then updates only after approval. **Method:** deployed manual workflow check.
- [ ] Run the seed and migration checks against the release database and record their output. **Method:** deployed database/release check.
- [ ] Reconcile the deployed Analytics totals with the approved seed/client-data totals. **Method:** deployed data reconciliation.
- [x] Repeat keyboard-only navigation in current desktop Chrome and Edge. **Method:** manual keyboard-only pass in Chrome and Edge; verified visible focus indicators, skip-link navigation, form/control Tab order, keyboard activation of controls and expandable filters, and keyboard operation of select controls. No issues found.
- [ ] Record a final automated accessibility scan of the deployed public and administrator pages. **Method:** automated axe scan against the deployed environment.

---

## Quality Commands

The following frontend release checks passed on 7 October 2026:

```text
npm test -- --run
25 test files passed; 186 tests passed

npm run typecheck
Passed

npm run lint
Passed with zero warnings

npm run build
Production build completed successfully

npx playwright test e2e/accessibility.spec.ts
9 accessibility tests passed; no serious or critical violations

npx playwright test
11 tests passed
```

The build reports the existing large-chunk advisory; it does not prevent a production build. These command results and the deployed workflow evidence above should be recorded on #70 or its release pull request.
