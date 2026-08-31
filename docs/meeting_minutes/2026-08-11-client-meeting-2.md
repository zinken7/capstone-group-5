# Client Meeting 2 — Requirements Elicitation with Representative Users

*Draft compiled from the recorded transcript. To be reviewed by attendees
before it is relied on. Items marked ⟨…⟩ need confirming.*

| | |
|---|---|
| **Date** | Tuesday 11 August 2026, 10:00 |
| **Format** | Online (MS Teams), recorded and transcribed |
| **Duration** | 1 hour 2 minutes |
| **Client** | Dr Adrian Boeing (UWA) |
| **Representative users** | Yash Singh (RCT Global), Market Data Analytics · Milan Ivovic (Epiroc), Regional Business Manager, Asia Pacific |
| **Group 5** | Hans Lionar (24661999), Tyrone Tran (24814799), Zerun Zhang (24389925) ⟨confirm remaining attendees⟩ |
| **Group 15** | Srinath Senthilkumar (24590108), Farahnaz Abdi (24575614), Haemin Choi (24761125) |
| **Purpose** | Elicit requirements from the representative users; both groups demonstrate their work and take feedback |
| **Reference code** | CM2 |

**Transcript gaps.** Roughly 18:42 to 27:39 and 33:28 to 35:34 were not
captured. Nothing in those windows is evidenced by this record.

---

## 1. The client's framing of the project

- The product is an interactive, open equivalent of a commercial market
  dashboard. Existing sources are closed, paid, and drawn from a single
  vendor, which the client described as "always questionable".
- The intent is a crowdsourced dataset where contributors verify and maintain
  the information, rather than a single provider asserting it.
- Purpose: identify which mining machines carry automation technology, and
  track what proportion of the fleet is converting to automation over time.

## 2. Epiroc perspective — Milan Ivovic

- **Customers operate in isolation.** They know their own fleet but not what
  comparable operations are doing.
- Customers expect Epiroc to identify patterns across users of the same
  technology and advise on upgrades, changes, or different ways of operating.
- **Site-to-site comparison is the value.** A site can be advised by pointing
  to a comparable one, matched on application, for example iron ore open pit,
  where the same technology kit is already working. The client read this back
  and Milan confirmed it.
- A demonstrated match "provides huge confidence to both people that are
  trying to sell this, implement, and also people receiving".
- Epiroc is a sales business, so the commercial purpose is upsell, but the
  order stated was value first, then upsell.
- **Configurable presentation.** Different Epiroc stakeholders want different
  levels of detail, from machine configuration to a high-level summary. Milan
  asked whether the dashboards are configurable.

**New to the project.** The client noted that site-to-site comparison was a
use case the team had not previously explored. It is not covered by any
current requirement and has been recorded in the backlog pending a written
requirement.

## 3. RCT Global perspective — Yash Singh

- **Two uses.** Product management, where roadmaps depend on what automation
  suppliers are releasing, tracked quarterly; and sales, where market share
  gained or lost is tracked monthly.
- **Early warning is the core need.** A Chinese supplier reached roughly 2,000
  automated trucks before RCT became aware, at which point they had already
  completed 1,000 to 1,500 machines, and had entered the Australian east
  coast. Data must be recent and comprehensive.
- Tracking also surfaces new entrants and consolidation among suppliers, and
  the shift of the market towards software and subscription models.
- **Market events requested.** Partnerships, acquisitions and new product
  launches, for example an automation supplier becoming a supplier to a major
  OEM. Yash wanted these visible rather than inferred from the data.
- **Filters requested.** Slicers above the charts, including a surface against
  underground filter, since some equipment is both.
- Confirmed as valuable: machines commissioned per year, share by country as
  its own chart, and filters that update every measure.

## 4. Prototype demonstration — Group 5

- The team showed the screen mockups and a working prototype populated with
  synthetic data.
- The map and the breakdown of assets by equipment type were both confirmed as
  useful.
- Selecting a country should update every chart, not only one.
- The client asked for share by country as an additional chart alongside the
  fleet mix.

### 4.1 Segmenting the market, confirmed by Yash Singh

The analytics view is expected to support drilling down from a machine type to
the players within it, in two steps.

1. **Manufacturers within a machine type.** "If I click on trucks and I want to
   see who is doing more of what in truck automation, that helps a lot."
2. **Payload class within that type.** Targeting a segment, for example
   lower-payload surface trucks used in quarries, and seeing which suppliers
   are present in that segment, on the basis that the heavy classes are already
   taken.

The client read this back as wanting to segment the market of machines, and
noted the equivalent for drills would be hole diameter rather than payload.
The team confirmed that filtering and sorting by payload, model name and
machine type is therefore required, and that these breakdowns belong on the
dashboard rather than on a record detail page.

**Effect on scope.** This is FR-31 and FR-32 in the requirements
specification, both currently *Should*, and FR-13, which records size class
and payload. A representative user has now confirmed all three directly, so
their priority should be reviewed.

## 5. Data sourcing

- The prototype runs on synthetic data. Real data is expected to come from the
  representative users.
- The client is also approaching BHP and Rio Tinto for their deployment
  datasets.
- Yash and Milan were asked to export a subset of their existing equipment
  databases so the team has real records to work against.
- The client identified the absence of real data as a blocker for the team.

## 6. Market forecasting requested, and declined for this semester

Milan Ivovic asked whether the system could project the market two years
forward, by combining the historical adoption trend for a machine type with
the published forecasts in mining companies' quarterly reports, to produce an
expected adoption rate and speed. He offered the request explicitly for the
team to rule out if it fell outside scope.

The team declined it, and gave three reasons.

- **Competence.** The team are IT practitioners rather than economists.
  Producing an economic projection is the work of a financial analyst, and one
  published under the team's name would not be appropriate.
- **Credibility.** A projection built on incomplete data would undermine
  confidence in the dataset itself. Tyrone Tran made the same point from the
  technical side: forecasting depends on a real dataset, and projections built
  on synthetic data would be meaningless.
- **A better route exists.** Rather than producing the analysis, the system
  gives an analyst what they need to produce it: a time control for viewing a
  chosen date range, and export of the dataset for independent analysis.

The client accepted this and closed the point by directing the obligation for
quality source data back to the representative users, so that any projection
made from the dataset is valid.

This is recorded as a *Won't* for this semester. The two capabilities offered
in its place are FR-19, the time control, and FR-37, dataset export, both
committed.

## 6.1 Automated report generation

Tyrone Tran described an intended capability in which an AI component queries
the database and generates a report from the result, and stated to the client
that this is not part of the MVP and would follow it. Recorded here so that
the boundary is on the record.

## 7. Access control

- Group 15 asked whether sign-in and roles are required, given sales, factory
  and technical stakeholders.
- Milan replied that no sign-in is needed because those stakeholders are
  internal to Epiroc.
- **Note.** This concerns Epiroc's own internal viewers, not the public
  crowdsourced platform. It does not resolve Q-11, which remains open.

## 8. Coordination between groups

- The client asked the two student project managers to coordinate with each
  other so that client sessions are held jointly rather than separately.

---

## Action items

| # | Action | Owner | Due |
|---|---|---|---|
| 1 | Export a subset of real equipment data for seeding | Yash Singh, Milan Ivovic | ASAP — identified as a blocker |
| 2 | Approach BHP and Rio Tinto for deployment datasets | Dr Boeing | Ongoing |
| 3 | Coordinate joint client sessions with the Group 15 project manager | M2 | Before the next client meeting |
| 4 | Record the site-comparison use case in the backlog | M2 | Done |
| 5 | Write a requirement for site comparison, or record the decision not to | M2 | Next SRS revision |
| 6 | Confirm the four-level automation scale (Q-1a) | Dr Boeing | Outstanding |
| 7 | Circulate the interactive prototype to the representative users | Dr Boeing | Requested 12 Aug, outstanding |
| 8 | Review the priority of FR-31, FR-32 and FR-13 now that a representative user has confirmed them | M2 | Next SRS revision |

## Open questions carried forward

| # | Question | Status |
|---|---|---|
| Q-1a | Is the four-level automation scale acceptable? | Open |
| Q-4 | What does the UWA hosting environment provide? | Open |
| Q-11 | Is the product public, or an internal dashboard? | Open. Not resolved by section 7 above |
| — | Is site-to-site comparison in scope, and at what priority? | New, raised at this meeting |

---

*Minutes drafted with assistance from Claude (Anthropic) from the recorded
transcript, and acknowledged in the report's AI use section.*