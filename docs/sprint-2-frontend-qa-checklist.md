# Sprint 3 Frontend Accessibility and Release QA Checklist

## Purpose

This checklist records the release checks for the current public and administrator workflows. It replaces the earlier Sprint 2 snapshot while keeping the same file path so existing links remain valid.

**Review branch used for this check:** `fix/70-accessibility-qa`

**Release gate:** #70

**Last reviewed:** 5 October 2026

The checks below cover source inspection and the automated UI suite. Items under “Final deployed checks” still need to be repeated against the deployed environment because local tests cannot prove the state of the hosted API or database.

---

## Automated Evidence

- [x] Application shell and route navigation are covered.
- [x] Keyboard navigation through the primary navigation is covered.
- [x] The skip link and focusable main-content target are covered.
- [x] Map filtering, historical year selection, site details, focus return, loading, error and empty states are covered.
- [x] Equipment filtering, sorting, pagination, CSV export and URL state are covered.
- [x] The public correction dialog and submission path are covered.
- [x] Analytics API-backed cards, shared filters, accessible table view, empty state and error state are covered.
- [x] Contribution form validation, reference-data loading, disclosure and submission states are covered.
- [x] Administrator sign-in, forced password change, queue, record review, correction, decision and account-management paths are covered.

Full frontend run on 5 October 2026:

```text
22 test files passed
144 tests passed
```

---

## WCAG 2.1 AA Checks (NFR-01)

### Keyboard operation and focus

- [x] A visible “Skip to main content” link bypasses the repeated header and primary navigation.
- [x] Primary and administrator navigation use labelled `nav` landmarks and native links.
- [x] Buttons, links, inputs, selects and text areas have visible focus styling.
- [x] Map filters and the site list can be operated without using the graphical markers.
- [x] Selecting a site moves focus to the site-detail heading; closing the card returns focus to the corresponding site button.
- [x] Collapsing or reopening the map panel moves focus to the replacement toggle.
- [x] The public correction dialog receives focus, contains Tab focus, closes with Escape and restores focus to its opener.
- [x] Equipment sort controls are buttons with `aria-sort` and descriptive accessible names.
- [x] The horizontally scrollable equipment table is a labelled keyboard-focusable region.

### Labels, names and status messages

- [x] Public contribution, correction and filtering controls have visible labels.
- [x] Contribution and correction field errors use `aria-invalid` and `aria-describedby` where field-specific feedback is available.
- [x] Form and API failures use alert semantics; loading, success and result updates use status or live-region semantics.
- [x] Icon-only map controls have accessible names, including distinct “Full screen” and “Exit full screen” states.
- [x] Tables use headers and captions where the surrounding heading does not already provide the table name.
- [x] Analytics charts expose a text description and can be changed to a data table.

### Contrast and use of colour

- [x] Main text colours meet the 4.5:1 normal-text contrast threshold on white.
- [x] The focus colour (`#2563eb`) has 5.17:1 contrast on white.
- [x] Interactive control borders use `#748094`, which has 3.99:1 contrast on white.
- [x] Deployment and verification states are written as text and are not communicated by colour alone.
- [x] Map marker status and size have text legends; the selected site’s deployment list also states each status.
- [x] Analytics values and status totals are available as text as well as colour-coded graphics.

---

## Public Workflow QA

### Map

- [x] Verified site records load from the API.
- [x] Supplier, machine type, country, automation, region, commodity and environment filters are labelled.
- [x] Decommissioned deployments are included only when explicitly selected.
- [x] The year slider states the year represented by the map and reports records excluded for missing commissioning years.
- [x] The sidebar site list provides a non-map route to the same site details.
- [x] Marker status and machine-count size are explained by visible legends.
- [x] Loading, retry and no-result states are present.

### Equipment Register and corrections

- [x] Only verified public records are shown.
- [x] Filtering, server-side sorting and pagination update the result summary and URL state.
- [x] Table status cells include readable status text.
- [x] CSV export is available for the filtered result.
- [x] A correction can be proposed from a record without exposing administrator controls.
- [x] The correction dialog explains that the proposed changes await review while the existing verified record remains public and unchanged.

### Analytics

- [x] Summary, breakdown and timeline data use the same filter state.
- [x] Each chart has loading, error and empty states.
- [x] Chart values include names, quantities and percentages in text.
- [x] Every chart card can show an accessible table alternative.
- [x] The page states that public analytics contain verified records only.

### Contribution

- [x] Required fields and disclosure are identified in text.
- [x] Validation feedback identifies the affected field.
- [x] Reference-data failure, submitting, API failure and success states are presented clearly.
- [x] A successful submission explains its review status instead of implying immediate publication.

---

## Administrator Workflow QA

- [x] Signed-out users are routed to the labelled administrator sign-in form.
- [x] Temporary-password users must choose a new password before reaching review functions.
- [x] The review queue identifies submissions and corrections, missing evidence and missing technology data in text.
- [x] Review links include the site and record id in their accessible names.
- [x] Record details include evidence, current verification status and revision history.
- [x] Approve, needs-changes and reject options include a short description of their outcome.
- [x] A note is required for needs-changes and rejection decisions.
- [x] Decision and correction failures are announced as alerts.
- [x] Root administrator account actions have account-specific accessible names and text status.

---

## Responsive and Data-State QA

- [x] Primary navigation remains usable at smaller desktop widths.
- [x] The map panel stacks above the map on narrow screens.
- [x] Equipment and administrator tables retain horizontal scrolling when required.
- [x] Form grids collapse without hiding labels or actions.
- [x] Public Map, Equipment and Analytics views have loading, error and empty states.
- [x] Contribution and administrator workflows have API-error feedback.
- [x] Frontend fixtures are used only by tests and are not presented as client data.

---

## Final Deployed Checks

- [ ] Complete one deployment submission, approve it in the administrator queue, and confirm that it appears in the public Map, Register and Analytics views.
- [ ] Complete one rejection or needs-changes decision and confirm that the record remains absent from public views.
- [ ] Submit and review one correction, confirming that the verified record stays public and unchanged while the proposal is pending, then updates only after approval.
- [ ] Run the seed and migration checks against the release database and record their output.
- [ ] Reconcile the deployed Analytics totals with the approved seed/client-data totals.
- [ ] Repeat keyboard-only navigation in current desktop Chrome and Edge.
- [ ] Record a final automated accessibility scan of the deployed public and administrator pages.

---

## Quality Commands

The following frontend release checks passed on 5 October 2026:

```text
npm test
22 test files passed; 144 tests passed

npm run typecheck
Passed

npm run lint
Passed with zero warnings

npm run build
Production build completed successfully
```

The build reports the existing large-chunk advisory; it does not prevent a production build. These command results and the deployed workflow evidence above should be recorded on #70 or its release pull request.
