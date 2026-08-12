# Problem Statement and Key Deliverables

<!-- Owner: TBC. Page target: 1.25 pages. Drafted from the SRS [7]: Sec. 1.2,
     2.2, 2.3, 7 and Appendix B. Citations are IEEE, numbered in order of first
     appearance; see 05-references-and-ai-use.md. [CONFIRM] marks anything
     needing a team decision. -->

## Client and Context

Our client is Dr Adrian Boeing of UWA. Two industry representative users
participate alongside him and attended the client meeting of 11 August 2026
[1]: Yash Singh of RCT Global, in market data analytics, and Milan Ivovic,
Regional Business Manager for Asia Pacific at Epiroc.

## The Problem

Data on autonomous and teleremote mining equipment deployed worldwide is closed
and commercially held. Market reports exist but cost in the order of $50,000 to
$100,000 each, placing them beyond startups, small suppliers and academic
researchers [2]. No open dataset was found to exist [2], and the commercial
dashboards that do exist draw their figures from a single vendor and cannot be
independently checked [1].

The cost of the market being poorly observed is concrete. A supplier can learn
that a competitor has entered its home market only after roughly 1,500 machines
have been deployed, and a change in the automation supplier behind a machine
brand can go unnoticed for months [1]. Currency and coverage therefore matter
as much as accuracy.

## Why the Client Wants This Software

The client's purpose is to return this information to the public domain. He
asked for an open, crowdsourced equivalent of the commercial dashboards under a
Creative Commons licence [3], so that the parties currently priced out of
market data — startups assessing whether a product has a market, small
suppliers, and academic researchers including the client — can obtain and
independently verify it. For the representative users the benefit is
operational: both described identifying sites at a lower automation tier and
approaching them about the next one [1], which no dataset available to them
today supports.

## Why an Open Dataset

The client's requirement that the data be openly licensed [3] (C-02) is not
incidental to the product. It is the mechanism by which the product solves the
problem.

- **Open data creates value the closed market does not capture.** McKinsey
  estimated that open data could generate more than US$3 trillion a year in
  additional economic value across seven sectors, oil and gas among them,
  largely by allowing parties other than the data holder to act on the
  information [4]. The mining market data problem is exactly this shape: the
  figures exist, but only inside the organisations that can afford them.
- **Transparency is established practice in extractives.** Fifty-five countries
  implement the EITI Standard, which obliges participants to publish
  extractives data in open formats that are "freely accessible, timely,
  comprehensive, reliable [and] comprehensible", with approximately US$3.3
  trillion in government revenues disclosed to date [5]. An open equipment
  dataset extends an accepted norm in this industry rather than introducing a
  new one.
- **Openness is what makes the data checkable.** The commercial dashboards the
  client cited draw their figures from a single vendor and cannot be
  independently verified [1]. An openly licensed dataset carrying per-record
  evidence links and a published verification status can be audited by anyone,
  which is the only mechanism by which a crowdsourced dataset earns trust.
- **An open licence lets the work outlive the semester.** Publishing the source
  under an open licence (NFR-10) allows UWA, a later capstone team or the
  industry itself to continue it. Harvard Business School estimate the
  demand-side value of open source software at US$8.8 trillion, and that firms
  would need to spend 3.5 times more on software were it not available [6].

## Proposed Solution

A web-based, crowdsourced, queryable geospatial database of autonomous mining
equipment, comprising an interactive map, an analytics view of market-level
trends, a queryable equipment register with export, and a contribution
mechanism carrying a verification state on each record. The system is a
reference dataset and presentation layer; it performs no mine planning, fleet
management or operational control.

## Minimum Viable Product

This section states *what* the MVP is. Evidence of the client's agreement to it
is given in Section 2. The MVP is the set of requirements prioritised **Must**
in our Software Requirements Specification; identifiers refer to [7, Sec. 4].

| # | Deliverable | Description | Acceptance criteria |
|:--|:-------------------|:---------------------------------------------|:-----------------|
| 1 | Data model | Companies, sites, machine models, technology products, deployments; manufacturer and technology supplier separately queryable; four automation levels | FR-01 to FR-09, FR-11 |
| 2 | Interactive GIS map | Marker per site coloured by deployment status, detail panel, filter by technology supplier | FR-16 to FR-19 |
| 3 | Analytics dashboard | Headline counts; cumulative machines over time; counts by country and machine type; share by supplier and manufacturer; filters on every measure | FR-22 to FR-28 |
| 4 | Equipment register | Searchable, filterable, sortable table with flattened tabular export | FR-37, FR-38 |
| 5 | Contribution and verification | Submission form publishing immediately; verification status; evidence links; administration interface for review and correction | FR-41 to FR-47 |

Deliverables 2 to 5 are the four functions named in the client's brief;
deliverable 1 is the structure they depend on.

## Out of Scope

Each exclusion below is justified in full in [7, Sec. 7]: self-service bulk upload,
institutional single sign-on via AAF, counting machines from photographs, fleet
management and dispatch systems, forecasting and market projection, and a
mobile application. The two that most affect scope are counting from
photographs, which cannot distinguish automation level or establish what is on
site rather than in frame, and forecasting, which is economic analysis rather
than software — data export is provided so that an analyst can do it externally
[1].
