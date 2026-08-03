# Assumptions to Validate with the Client

The MVP makes these reversible assumptions because the first client meeting has not occurred:

1. **A record may represent a fleet.** `quantity` is used when machine-level serial numbers are unavailable.
2. **Public read access; moderated write access.** Anyone may browse and submit, but only reviewers may publish.
3. **At least one evidence URL is mandatory.** The reviewer judges whether the source is sufficiently credible.
4. **A point represents a mine site.** Exact equipment coordinates are not stored.
5. **Synthetic seed data is used.** No demo record should be presented as a factual industry claim.
6. **File uploads are excluded from the first MVP.** Users link public case studies; storage policy must be agreed first.
7. **UWA-hosted Docker is acceptable.** The application has no mandatory AWS dependency.
8. **English is the initial interface language.**

## Highest-priority client decisions

- Is the primary unit an individual machine, a fleet/deployment, or both?
- What source types qualify for verification, and who may review them?
- Should unverified submissions be publicly visible?
- What fields are mandatory for each equipment category?
- Does UWA require SSO, a specific database, or a specific hosting platform?
- Are users allowed to upload copyrighted reports, images or PDFs?
- Is historical change tracking required for assessment or launch?
