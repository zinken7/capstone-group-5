# Software Requirements Specification

## Autonomous Mining Equipment Market Map

| | |
|---|---|
| **Version** | 0.4 — draft for team review and client confirmation |
| **Date** | 26 August 2026 |
| **Client** | Dr Adrian Boeing, UWA |
| **Representative users** | RCT Global (Yash Singh, market data analytics) · Epiroc (Milan Ivovic, Regional Business Manager, Asia Pacific) |
| **Unit** | CITS5206 Capstone Project, Semester 2 2026 |
| **Prepared by** | Group 5 — Hengan Weng (24201874), Shee Wang (24368932), Zerun Zhang (24389925), Hans Lionar (24661999), Zunhao Zhang (24758673), Tyrone Tran (24814799) |

### Revision history

| Version | Date | Author | Change |
|-------|--------------|----------------|-----------------------------------------------------------------------------------|
| 0.1 | 10 Aug 2026 | Group 5 | Initial draft, from the client meeting of 6 August, the facilitator meeting of 7 August, and the written project brief |
| 0.2 | 11 Aug 2026 | Group 5 | Incorporates the client and representative user meeting of 11 August, and internal review. Issued to the client on 12 August 2026 |
| 0.3 | 25 Aug 2026 | Hans Lionar (M2) | Automation banding withdrawn: four levels are now recorded **and** presented, so the former FR-10 rollup is removed and the map, analytics and data-model requirements are renumbered. Region promoted from a text field to reference data. Satellite and aerial imagery recorded as out of scope, with Q-12. Vendor sources REF-4 and REF-5 added in support of the four-level scale. Historical dates raised from *Could* to *Must*, and the map time control from *Could* to *Must*, both being required by the capability offered in place of market forecasting |
| 0.4 | 26 Aug 2026 | Hans Lionar (M2) | Section 5 aligned to the submitted Deliverable 1 report and to `docs/database/ERD.md`, which the project plan makes normative for enumerations and constraints. The duplicate diagram in 5.1 is replaced by the maintained one, so the technology product is correctly optional on a deployment before verification (FR-08), and the administrator and verification review entities required by FR-43 and FR-45 are present. No requirement renumbered or reprioritised |

### Requirement status convention

Every requirement carries a status. This distinguishes what the client has stated from what the team has inferred, and prevents assumptions being mistaken for agreement.

| Status | Meaning |
|---|---|
| ✅ **Confirmed** | Stated by the client. Source referenced, using the codes defined in Section 1.4. |
| ❓ **Assumed** | Inferred by the team. Carries no client source. Each is mapped to an open question in Appendix A. |

Priority uses MoSCoW: **M** must have · **S** should have · **C** could have · **W** won't have this semester.

---

# 1. Introduction

## 1.1 Purpose

This document specifies the requirements for the Autonomous Mining Equipment Market Map, a web application that catalogues autonomous and teleremote mining equipment deployed worldwide. It is intended for the project team, the client, and the unit facilitator, and serves as the reference against which the delivered system is assessed.

## 1.2 Scope

The system is a **web-based, crowdsourced, queryable geospatial database** of autonomous mining equipment. It comprises:

- a **map** presenting deployments geographically,
- an **analytics view** presenting market-level trends,
- a **queryable equipment register** with data export,
- a **contribution mechanism** allowing industry participants to submit and correct records, with a verification state attached to each record.

The system does not perform mine planning, fleet management, or any operational control function. It is a reference dataset and presentation layer.

**The problem it addresses.** Data on autonomous mining equipment is closed and commercially held. Market reports exist but cost in the order of $50,000–$100,000 per report, placing them beyond the reach of startups, small suppliers and academic researchers (CM1). No open dataset was found to exist (CM1). The product is intended as an open, crowdsourced equivalent of the commercial market dashboards, whose figures come from a single vendor and cannot be independently checked (CM2). The project's purpose is to create that dataset and return the information to the public domain.

The cost of the market being poorly observed is concrete. A supplier can learn of a competitor entering its home market only after roughly 1,500 machines have been deployed, and a change in the automation supplier behind a machine brand can go unnoticed for months (CM2). Currency and coverage therefore matter as much as accuracy.

## 1.3 Definitions and abbreviations

### Automation terminology

These terms are the subject of open question Q-1a and are defined further in Section 2.6.

| Term | Definition |
|---|---|
| **Autonomous machine** | A machine intended to operate in autonomous mode during its normal operating cycle (ISO 17757:2019). |
| **Autonomous mode** | A mode in which the machine performs all safety-critical and mining functions related to its defined operations without operator interaction (ISO 17757:2019). |
| **Semi-autonomous machine** | A machine that operates autonomously during part of its cycle and requires active operator control to complete some tasks (ISO 17757:2019). |
| **Remote control** | Operator control of a machine from a device not located on the machine (ISO 17757:2019). |
| **Teleremote** | Industry term, not defined by ISO. Remote operation from a control station using camera and telemetry feeds, without line of sight. An operator is still driving the machine. |
| **Line of sight remote** | Remote operation where the operator can directly see the machine. |
| **ODD** | Operational design domain. The conditions under which an automated system is designed to function. |
| **Operator-to-machine ratio** | The number of machines a single operator controls. A commercial distinction between vendor product tiers; not recorded as a field. |

### Equipment and operations

| Term | Definition |
|---|---|
| **AHS** | Autonomous Haulage System. An automated haul truck fleet. |
| **Haul truck** | Large off-highway truck carrying ore or waste from the pit. |
| **LHD** | Load-Haul-Dump machine, also called a scoop tram. The common underground loader. |
| **Ultra class** | Haul truck size class, generally 290 t payload and above. |
| **Dozer** | Tracked or wheeled machine for pushing material. |
| **Excavator / shovel** | Machine that loads material into haul trucks. |
| **Drill rig** | Machine that drills blastholes for explosives, or drills underground development. |
| **Scaling machine** | Underground machine that removes loose rock from tunnel walls and roof. |
| **Shotcrete machine** | Underground machine that sprays concrete to support tunnel walls. |
| **Tramming** | Driving a machine between locations, as distinct from loading or dumping. |
| **Payload** | The mass a machine is rated to carry. |
| **Retrofit** | Fitting an automation system to a machine that was manufactured without it. |
| **Open pit / surface mining** | Mining from the surface. |
| **Underground mining** | Mining via shafts and tunnels. Considerably more varied in machine types than surface mining. |

### Commercial and organisational

| Term | Definition |
|---|---|
| **OEM** | Original equipment manufacturer. The company that built the machine, e.g. Caterpillar, Komatsu, Liebherr. |
| **Technology supplier** | The company supplying the automation system, frequently **not** the machine manufacturer. |
| **Mining contractor** | A company engaged to operate a site or its equipment on behalf of the owner. A substantial part of the market. |
| **Joint venture** | Shared ownership of a site by two or more companies. Common, and the reason site ownership is many-to-many. |
| **Tenement** | The legal title granting rights to mine an area. |
| **Commodity** | The material extracted — iron ore, coal, gold, copper, lithium. |
| **Commissioning** | The period during which a site or machine is brought into service before full operation. |
| **FMS** | Fleet management system. Dispatch and production software, e.g. Wenco, Modular Mining. Distinct from automation. |
| **CAGR** | Compound annual growth rate. |

### Project and document terms

| Term | Definition |
|---|---|
| **Site** | One mine, at one location.  The place a deployment sits.  Roy Hill, Mount Whaleback and Cape Lambert are three separate sites, all of them in the Pilbara region. |
| **Region** | The mining region a site sits in, below national level — for example the Pilbara, the Bowen Basin, Atacama. Not a commercial sales territory such as Asia Pacific; grouping above national level is by country. |
| **Machine type** | The category of machine — haul truck, dozer, excavator, loader, drill, LHD, scaler, shotcrete machine. |
| **Machine model** | A specific model from a manufacturer, for example Caterpillar 793F. A model implies its machine type. |
| **Deployment** | The central record of this system. A quantity of one machine model, at one site, fitted with one technology product, from a given date. |
| **Technology product** | A named automation system, e.g. Cat Command for Hauling, Sandvik AutoMine, RCT ControlMaster. |
| **Automation level** | One of the four vendor product tiers recorded against a technology product: line-of-sight remote, teleremote, semi-autonomous or autonomous (Section 2.6). |
| **Verification status** | Where a record stands in review: unverified, pending review, verified or rejected. |
| **Site status** | Whether the mine itself is operating or under commissioning. Distinct from deployment status. |
| **Deployment status** | Whether a particular quantity of automated equipment at a site is announced, being commissioned, operational or decommissioned. |

## 1.4 References

| Ref | Document |
|---|---|
| BRIEF | Autonomous Mining Equipment Market Map — client project description — https://teaching.csse.uwa.edu.au/units/capstone/projects/submit-preference/8/ |
| CM1 | Client Meeting 1 minutes and transcript, 6 August 2026 |
| CM2 | Client and representative user meeting, 11 August 2026 — Dr Boeing, Yash Singh (RCT Global), Milan Ivovic (Epiroc), Group 5 and Group 15. Full transcript |
| FM1 | Facilitator Meeting 1 minutes and transcript, 7 August 2026 |
| REF-1 | AV Map — https://avmap.io/ (reference site nominated by client) |
| REF-2 | Brad Templeton, Autonomy Map — https://www.templetons.com/brad/robocars/autonomap.html (reference site nominated by client) |
| REF-3 | CSRankings — https://csrankings.org/ (crowdsourced submission model nominated by client) |
| REF-4 | RCT Global, AutoNav — five scalable levels of automation: line-of-sight control, tele-remote, semi-automation, multi-machine automation, fleet automation — https://rct-global.com/technology/automation-control/ |
| REF-5 | Sandvik Mining, AutoMine automation portfolio — Tele-Remote, Lite, Multi-Lite and Core for underground loading and hauling; Line of Sight, Control Room and Autonomous for surface drilling — https://www.mining.sandvik/en/digital-solutions/automation/ |
| STD-1 | ISO 17757:2019 — *Earth-moving machinery and mining: autonomous and semi-autonomous machine system safety*. Catalogue entry: https://www.iso.org/standard/76126.html · Terms and definitions, Online Browsing Platform: https://www.iso.org/obp/ui/en/#iso:std:iso:17757:ed-2:v1:en |
| STD-2 | Global Mining Guidelines Group, *Guideline for the Implementation of Autonomous Systems in Mining*, version 2, 2024. Section 2.1, Figure 1 *Mining Automation Maturity Model*, p. 7 — https://gmggroup.org/wp-content/uploads/2024/08/GUIDELINE_Implementation-of-Autonomous-Systems-1.pdf |
| STD-3 | SAE International J3016_201806, *Taxonomy and Definitions for Terms Related to Driving Automation Systems for On-Road Motor Vehicles*, 2018 — the taxonomy GMG adapted — https://www.sae.org/standards/content/j3016_201806/ |

## 1.5 Document overview

Section 2 describes the product context, users and constraints. Section 3 specifies external interfaces. Section 4 specifies functional requirements and Section 5 the logical data structure. Section 6 specifies non-functional requirements. Section 7 records what is deliberately out of scope. Section 8 records assumptions and dependencies.

Appendix A lists the open questions requiring client confirmation, with the hosting environment checklist. Appendix B is a checklist for recording the client's confirmation of scope.

Every requirement carries a source, recorded in the tables and using the codes defined in Section 1.4: the written project brief (BRIEF), the meeting records (CM1, CM2, FM1), the reference sites nominated by the client (REF-1 to REF-3), the vendor catalogues consulted (REF-4, REF-5), and the standards consulted (STD-1 to STD-3). A requirement with no such source is the team's own proposal and is marked ❓.

---

# 2. Overall description

## 2.1 Product perspective

The system is a new, self-contained web application with no dependency on existing systems and no predecessor. No comparable open dataset exists (CM1).

It draws design precedent from two reference sites nominated by the client (REF-1, REF-2), both of which map autonomous vehicle deployments on public roads, and from CSRankings (REF-3) for its crowdsourced submission model.

## 2.2 Product functions

The brief specifies four deliverables, and they are the system's four functions. The first three were described by the client in CM1, and the set of four was accepted in CM2.

| Function | Named in the brief as | Purpose |
|---|---|---|
| **Interactive GIS map** | *An interactive GIS Map layer demonstrating geographical asset distribution* | Orientation and browsing. A user unfamiliar with the domain explores the map and learns from it. |
| **Analytics dashboard** | *A Data Analytics Dashboard visualizing automation adoption trends* | Market-level measures only — counts and shares by supplier, manufacturer, country, machine type and automation level, and how they change over time. |
| **Queryable equipment register** | *A queryable database of global autonomous mining assets* | The record set itself, searchable and sortable, with export so users can analyse the data externally. |
| **Verified crowdsourcing** | *A verified crowdsourcing mechanism allowing industry professionals to submit new kit data* | Submission, correction and verification of records — the mechanism by which the dataset is built. |

These are presented as three top-level tabs, with the dashboard and the register as sub-views of a common data section. Section 3.1 describes the screens.

## 2.3 User characteristics

| User class | Description | Primary needs |
|---|---|---|
| **Academic / researcher** | Including the client. Studies market and technology trends. | Which automation products are being adopted, and how that is shifting. Raw data for independent analysis. |
| **Startup** | Evaluating whether a product idea has a market. | General market data: which segments and regions are saturated, which are open. |
| **Technology supplier — market analyst** | e.g. RCT Global. Supports product managers and sales managers with market data, reviewed quarterly and tracked monthly (CM2). | Market share held and lost; new entrants and consolidation among automation suppliers; where a segment is unautomated and therefore addressable. |
| **Technology supplier — regional sales** | e.g. Epiroc. Sells and implements automation across a region (CM2). | Which technology is deployed at sites comparable to a given customer's — same commodity, same mining method — in order to recommend an equivalent configuration. |
| **Contributor** | Industry participant adding or correcting records. Often site-level personnel. | Fast, low-friction submission. Frequently possesses accurate figures with no published source. |
| **Administrator** | Client or delegate. | Review and verification of submissions; correction of erroneous records; maintenance of reference data such as automation levels held against technology products. |

Casual users with no specific goal are not treated as a separate class; their needs are met by the map without additional requirements.

Within a single supplier's sales and operations function, distributed across country offices, the expected readership is of the order of 100 people (CM2). This is an indication of scale, not a performance target.

## 2.4 Constraints

| ID | Constraint | Source |
|---|---|---|
| C-01 | The application must be deployable within a UWA IT environment as far as practical. The phrase is the brief's and admits several readings — see Q-4. | BRIEF |
| C-02 | Data is to be published openly under a Creative Commons licence. | BRIEF |
| C-03 | Technology stack is the team's choice, subject to C-01. | BRIEF |
| C-04 | Delivery is bounded by the Semester 2 2026 academic calendar and the team's available hours. | FM1 |
| C-05 | No seed dataset exists at project start. The client will supply generic data extracted from a market report, and has approached BHP, Rio Tinto and RCT; he expects perhaps two of three to provide data, and timing is uncertain. | CM1 |
| C-06 | Contributed data will vary widely in completeness. Corporate sources are expected to provide high-level data only. | CM1 |

## 2.5 Operating environment

Modern desktop web browser. No installation, no mobile application, no offline mode in this release.

## 2.6 Automation classification

**Why the dataset requires an automation attribute.** The brief does not list automation level among the fields to be collected, but two functions depend on it: determining what equipment is in scope, and filtering and grouping records in the map and analytics views. It is therefore held as a derived attribute of the technology product rather than a value collected from contributors.

> **Status: a minimum of three levels is confirmed; their definitions are not.** The client set three levels — baseline, teleremote and autonomy — as the minimum the system must distinguish, and noted that the terms need defining before they can be applied consistently (CM2). The definitions are Q-1a.

**The adopted vocabulary is the industry's own (Framework C below), not a standard.** Baseline, teleremote and autonomous are the words suppliers publish and contributors will recognise, and they are the words the client used. Two published frameworks are described first because they are what give those words a defensible definition: ISO 17757 supplies the terminology, and the GMG maturity model supplies the graduations. Neither is presented in the interface.

### Framework A — ISO 17757:2019

*Earth-moving machinery and mining: autonomous and semi-autonomous machine system safety* (STD-1). Terminology, oriented to safety. Terms and definitions are viewable without purchase on the ISO Online Browsing Platform: <https://www.iso.org/obp/ui/en/#iso:std:iso:17757:ed-2:v1:en>

| Term | Meaning |
|---|---|
| Autonomous machine | Operates in autonomous mode during its normal operating cycle |
| Semi-autonomous machine | Autonomous for part of the cycle; operator control required for some tasks |
| Remote control | Operator control from a device not on the machine |

"Teleremote" does not appear in the standard.

### Framework B — GMG *Implementation of Autonomous Systems*, v2 (2024)

The mining industry's own guideline, published by the Global Mining Guidelines Group (STD-2). Its maturity model is **adapted from the SAE International (2018) taxonomy of driving automation (STD-3) and expressed in ISO 17757 terminology** (STD-2, Section 2.1). Full text: <https://gmggroup.org/wp-content/uploads/2024/08/GUIDELINE_Implementation-of-Autonomous-Systems-1.pdf>

| Level | Name | Definition (abridged from the guideline) | Band |
|---|---|---|---|
| **0** | No automation or autonomy | Entirely manual. Operator completes all tasks. | Manual |
| **1** | Operator assistance | Some function-specific automated features. The operator completes most tasks and maintains control. | Semi-autonomous |
| **2** | Partial automation | The system controls multiple functions within a set of defined operations. The operator performs other tasks and is generally responsible for situation awareness. | Semi-autonomous |
| **3** | Full automation | The system completes continuous operations autonomously, including situation awareness in the designated autonomous area. It identifies when intervention is needed and enters a halted state. **The operator performs the fallback.** | Autonomous |
| **4** | Partial autonomy | As level 3, but **the system performs the fallback** within a limited ODD, halting only in higher-risk situations. The supervisor may request disengagement. | Autonomous |
| **5** | Full autonomy | The system fully controls the machine, performs the fallback, and covers the same use cases as an operator within the same ODD. | Autonomous |

Note the ordering: **"Full automation" (3) sits below "Partial autonomy" (4)**. The distinction is not capability but responsibility for the fallback — at level 3 the operator recovers a halted machine; at level 4 the system recovers itself.

The figure groups the levels into three bands: **Manual** (level 0), **Semi-autonomous** (levels 1–2), and **Autonomous** (levels 3–5). It also defines operation-level stages beneath them: **manual operation**, **hybrid operation** (a mixed fleet), and **highly autonomous operation**.

Source: STD-2, Section 2.1, Figure 1 *Mining Automation Maturity Model*, page 7. Definitions in the table above are abridged from that figure.

> ⚠️ **Caveat on applicability.** The guideline describes the model as reflecting "the overall operation's level of autonomy" while also stating that levels are "assigned to mining equipment". Its primary intent appears to be operational maturity rather than per-machine classification. Applying it per technology product, as proposed below, is a reasonable adaptation but should be confirmed.

### Framework C — vendor vocabulary · **adopted**

Suppliers do not sell a continuum. They sell a ladder of distinct, separately priced tiers, and publish it as such: RCT markets five scalable levels of AutoNav (REF-4), and Sandvik's AutoMine range is structured the same way (REF-5). These are the terms a contributor will recognise and the terms a published announcement will use.

| Level | Name | What the operator does | Operators per machine | RCT AutoNav (REF-4) | Sandvik AutoMine (REF-5) | ISO 17757 | GMG |
|---|---|---|---|---|---|---|---|
| **1** | Line-of-sight remote | Drives by radio, watching the machine directly | 1 : 1 | Line-of-sight control | AutoMine Line of Sight | Remote control | 0 |
| **2** | Teleremote | Drives from a remote station on cameras and telemetry, without line of sight | 1 : 1 | Tele-remote | AutoMine Tele-Remote · Control Room | Remote control | 0–1 |
| **3** | Semi-autonomous | The machine performs the repetitive part of the cycle — typically tramming — while the operator performs the skilled part remotely | 1 : 1 or 1 : few | Semi-automation | AutoMine Lite | Semi-autonomous machine | 1–2 |
| **4** | Autonomous | The machine completes the operating cycle unattended within a designated area; one supervisor oversees several machines or a fleet | 1 : many | Multi-machine automation · Fleet automation | AutoMine Multi-Lite · Core · Autonomous | Autonomous machine | 3–5 |

The scale is ISO 17757's three terms, with **remote control split into the two tiers vendors sell separately**. The operator-to-machine ratio is what changes commercially across the four, and it is why they are priced as distinct products.

**Why four rather than five.** RCT publishes five levels, separating multi-machine automation from fleet automation; Sandvik makes the same separation between Multi-Lite and Core. The distinction between them is the size of the fleet under one supervisor, not what the operator does — in both cases the machine completes its cycle unattended. Levels 4 and 5 are therefore recorded as a single autonomous level. The four boundaries that remain each mark a change in the operator's role, which is what makes them observable from a published source.

Note that remote operation, however sophisticated the control room, does not by itself make a machine autonomous: at levels 1 and 2 the operator is still driving. This is where the vendor vocabulary and the standards diverge most sharply, and it is the distinction the dataset exists to record.

### Proposal

**0. Four levels are recorded and presented.** Three levels were set as a minimum rather than a limit (CM2). The team proposes recording the four vendor tiers of Framework C, for three reasons.

*Suppliers publish four or more tiers, not three.* RCT markets AutoNav as five scalable levels — line-of-sight control, tele-remote, semi-automation, multi-machine automation and fleet automation (REF-4). Sandvik's AutoMine range is structured the same way, with Tele-Remote, Lite, Multi-Lite and Core for underground loading and hauling, and Line of Sight, Control Room and Autonomous for surface drilling (REF-5). Two independent suppliers therefore price semi-automation as a product distinct from both teleremote and full autonomy. A three-level scale cannot represent that market; a four-level scale can, and maps onto both vendors' ladders without loss.

*The primary use case needs the fourth.* Both representative users described the same analysis: identify sites operating at a lower tier and approach them about the next one (CM2). That analysis is a query over the level — find the machines at line-of-sight or teleremote in a given country, and target them for semi-autonomy. Merging those tiers makes the query unanswerable from the wrong side of the distinction that generates the sale.

*Aggregation is one-way.* A finer scale can always be grouped into a coarser one; a coarser scale cannot be split afterwards without revisiting every record and every classification decision. The fourth level costs one enumerated value now and cannot be recovered later.

Four levels satisfy the client's requirement of at least three, and distinguish the tiers the suppliers themselves sell. ISO 17757 and the GMG levels are recorded per product as the basis of classification and are not shown to a user. The scale is subject to confirmation in Q-1a.

**1. The technology product name is the primary fact.** It is what a contributor knows and what a published source states, and it is the system's principal subject: which automation technology is fitted to a machine, and which company supplied it (CM1). Automation level is a derived grouping attribute, not a collected value.

**2. Levels are assigned per product, by an administrator, as products are encountered.** The full population of automation products cannot be enumerated in advance — a realistic estimate is fifty or more, once vendor tiers and underground categories are counted. A product is therefore created when a contributor first names it, and classified by an administrator during review. The level is nullable, so an unclassified product does not block a record from being accepted. A contributor never classifies a machine and is never shown a level during submission.

**3. Attributes are recorded against the technology product**, not the deployment: the vendor term as published, the assigned level, and the basis on which it was assigned. Specified in FR-09 and modelled in Section 5.

**4. Scope is limited to equipment with an automation product fitted.** Entirely manual equipment is excluded, since it comprises effectively the whole global fleet and is neither collectable nor within the product's purpose. Teleremote equipment is in scope, being one of the four levels (CM2). Specified in FR-08.

**5. An unclassified record is still worth holding.** Public sources frequently report that a machine is automated without stating to what degree, and a representative user identified this as the normal case rather than the exception (CM2). Knowing that automation is present is itself useful. The level is therefore nullable, and a record whose level is unknown is retained and counted, reported as unclassified rather than assigned a default.

---

# 3. External interface requirements

## 3.1 User interfaces

Four primary screens. Static mockups exist for each (see `docs/ui/`), and are indicative of structure rather than final visual design.

| Screen | Contents |
|---|---|
| **Map** | Geospatial view with filter panel, markers coloured by deployment status, and a detail panel listing the selected site's deployments — machine model or type, quantity, technology supplier and status — with a link through to the full record. |
| **Data → Analytics** | Headline statistics strip, market trend charts. |
| **Data → Equipment** | Filterable record table with export and per-record edit. |
| **Contribute** | Submission form. |

Navigation is three top-level tabs — Map, Data, Contribute — with Analytics and Equipment as sub-views of Data.

## 3.2 Hardware interfaces

None. The system does not interface with machinery, sensors or on-site equipment.

## 3.3 Software interfaces

| Interface | Purpose | Status |
|---|---|---|
| Identity provider (Microsoft, Google) via OpenID Connect | Optional contributor sign-in and email domain confirmation | ❓ Proposed |
| Geocoding service | Resolving new mine site locations to coordinates | ❓ Proposed |
| Web search service | Locating public evidence for a submitted claim (FR-55) | ❓ Proposed |
| Language-model service | Assessing retrieved evidence and producing the verification report (FR-55) | ❓ Proposed |

No commercial map tile service is required. The base map is drawn from a static public-domain vector dataset of coastlines and borders, which is sufficient at the zoom levels this system uses — the map answers where deployments are, not what a site looks like.

**Satellite and aerial imagery are excluded from this release** and proposed as a later extension. See Section 7 for the reasons.

## 3.4 Communications interfaces

All traffic between browser and server uses HTTPS. Requests to external services — map tiles, identity providers, and any search or language-model service — likewise use HTTPS. No other network protocol is required.

---

# 4. Functional requirements

## 4.1 Data model

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| FR-01 | The system shall record equipment deployments linked to a mine site, each recording machine model, manufacturer, machine type, quantity and technology product. | M | ✅ | CM1, BRIEF |
| FR-02 | The system shall record the base machine manufacturer and the technology supplier as separate, independently queryable values. | M | ✅ | CM1, BRIEF |
| FR-03 | The system shall record any number of companies against a mine site, each with a stated role of owner, operator or contractor. | M | ✅ | CM1 |
| FR-04 | The system shall record mine sites with name, coordinates, commodity, and the operating status of the mine itself, which is distinct from the status of any deployment at that site. Associated companies are recorded per FR-03. | M | ✅ | CM1 |
| FR-05 | The system shall record the commissioning date of each deployment, and its status as one of announced, commissioning, operational or decommissioned. | M | ✅ | CM1, BRIEF |
| FR-06 | The system shall support surface and underground machine types, including haul trucks, LHDs, dozers, drills, scalers and shotcrete machines. | M | ✅ | CM1 |
| FR-07 | The system shall accept a record where the defined minimum field set is present, with all other fields optional. | M | ✅ | CM1, C-06 |
| FR-08 | The system shall accept records only for equipment with an automation product fitted. The product need not be named at submission, but shall be named before the record is verified. | M | ❓ | Team proposal, Section 2.6 — see Q-1a and Q-5 |
| FR-09 | The system shall classify each technology product at one of four automation levels — line-of-sight remote, teleremote, semi-autonomous or autonomous — and shall hold the vendor term and the basis of classification alongside it. The level shall be editable only by an administrator, and may be left unassigned. | M | ❓ | CM2 confirms the attribute; four-level granularity is a team proposal, see Q-1a |
| FR-10 | The system shall record whether a deployment operates on the surface, underground, or both. | M | ✅ | CM2 |
| FR-11 | The system shall record valid-from and valid-to dates on each deployment, so that the state of the dataset at a past date can be reconstructed. | M | ❓ | Required by FR-19 |
| FR-12 | The system shall support geographic grouping of deployments by mine site, region and country, region being selected from a maintained list rather than entered as text. Association of sites with companies is by role, per FR-03. | S | ✅ | CM1, BRIEF |
| FR-13 | The system shall record machine size class, maximum payload and operating weight. | S | ✅ | CM1, BRIEF |
| FR-14 | The system shall mark equipment as decommissioned rather than deleting it, and create a new record where equipment relocates. | S | ✅ | CM1 |

\newpage

## 4.2 Map

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| FR-15 | The system shall display a map with one marker per mine site at its geographic location. | M | ✅ | CM1 |
| FR-16 | The map shall default to operational deployments. A user shall be able to include decommissioned deployments through an explicit option, while a date-restricted view shall include deployments valid on the selected date regardless of their current status. Marker colour shall not be the sole encoding of status; status shall remain available as readable text in the site detail. | M | ✅ | CM3 supersedes CM1, REF-2 |
| FR-17 | Selecting a marker shall display the site and, for each deployment recorded against it, the machine model or, where no model is recorded, the machine type; together with quantity, technology supplier and status. Further detail is served by the equipment register. | M | ✅ | CM1 |
| FR-18 | The map shall be filterable by technology supplier. | M | ✅ | CM1 |
| FR-19 | The map shall provide a time control that restricts the markers shown to deployments in service at a selected date, so that accumulation over time can be observed. Deployments with no commissioning date are excluded from a date-restricted view, and the number excluded shall be stated. | M | ✅ | CM1, CM2, REF-1 |
| FR-20 | The map shall be filterable by country, region, machine type, automation level, commodity, and surface or underground operation. | S | ✅ | CM2 |

## 4.3 Analytics

All measures below are computed over recorded deployments — that is, over automated equipment held in this dataset. They are not proportions of the total mining fleet, which the system does not record. Every measure is subject to the filters in FR-36.

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| FR-21 | The system shall display headline statistics: total automated machines recorded, total sites, and countries covered. | M | ✅ | CM1 |
| FR-22 | The system shall display the cumulative count of machines in service over time. | M | ✅ | CM2 |
| FR-23 | The system shall display the count of machines by country. | M | ✅ | CM2 |
| FR-24 | The system shall display the count of machines by machine type. | M | ✅ | CM2 |
| FR-25 | The system shall display the share of machines held by each technology supplier. | M | ✅ | CM1, CM2 |
| FR-26 | The system shall display the share of machines held by each machine manufacturer. | M | ✅ | CM2 |
| FR-27 | The analytics view shall provide filters for country, region, machine type, manufacturer, technology supplier, automation level, commodity, and surface or underground operation, applying to every measure displayed. | M | ✅ | CM2 |
| FR-28 | The analytics view shall report only the aggregate measures specified in this section. Analysis of individual records is served by the register and by data export. | M | ✅ | CM1 |
| FR-29 | The system shall display the share of machines at each automation level, and the same breakdown for a selected country. | S | ✅ | CM2 |
| FR-30 | The system shall display the number of machines newly commissioned in each year. | S | ✅ | CM2 |
| FR-31 | Selecting a machine type shall show the manufacturers and technology suppliers active in that type, ranked by machine count. | S | ✅ | CM2 |
| FR-32 | Within a selected machine type, the system shall break down machine counts by payload class. | S | ✅ | CM2 |
| FR-33 | The system shall display the count of machines by company role, each role aggregated separately. | S | ✅ | CM1 |
| FR-34 | The system shall display, for each country, the compound annual growth rate of the cumulative number of machines in service. Countries whose count is zero at the start of the period are reported as an absolute increase, the rate being undefined from a zero base. | C | ✅ | CM1 |
| FR-35 | The analytics view shall allow a user to choose which measures are displayed and retain that arrangement between sessions. | C | ✅ | CM2 — see Q-11 |

## 4.4 Equipment register and export

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| FR-36 | The system shall provide a searchable, filterable and sortable register of equipment records. | M | ✅ | BRIEF |
| FR-37 | The system shall export the dataset in a flattened tabular format suitable for external analysis. | M | ✅ | CM1, CM2 |
| FR-38 | Selecting a machine model shall display its recorded attributes — manufacturer, machine type, size class, payload and operating weight — together with the deployments recorded against it. | S | ❓ | Team proposal |
| FR-39 | Where a manufacturer's product page for a machine model is known, the model view shall link to it. | C | ❓ | Team proposal |

## 4.5 Contribution and verification

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| FR-40 | The system shall allow users to submit new equipment records via a web form. | M | ✅ | CM1, BRIEF |
| FR-41 | The submission form shall state that a contributor must submit only information they are authorised to disclose. | M | ❓ | Team proposal — see A-04 |
| FR-42 | Submitted records shall be published immediately on submission. | M | ✅ | CM1 |
| FR-43 | Each record shall carry a verification status of unverified, pending review, verified or rejected. Public views shall default to verified records only. | M | ✅ | CM1 |
| FR-44 | The system shall allow contributors to attach one or more evidence links to a record. | M | ✅ | CM1, BRIEF |
| FR-45 | The system shall provide an administration interface for reviewing, verifying and rejecting submissions. | M | ✅ | CM1 |
| FR-46 | The system shall allow existing records to be corrected. | M | ✅ | CM1 |
| FR-47 | The system shall retain prior versions of a record so that an incorrect edit may be reverted. | S | ❓ | Team safeguard |
| FR-48 | Editing a verified record shall return its status to pending review. | S | ❓ | Team safeguard |
| FR-49 | The system shall allow supporting media — case studies, articles, videos — to be linked to companies, sites or equipment. | S | ✅ | CM1, BRIEF |
| FR-50 | The system shall provide a contact route for bulk data contributions, processed as a manual import. | S | ✅ | CM1 |
| FR-51 | The submission form shall include an automated-submission challenge to prevent bulk spam, without requiring the contributor to hold an account. | S | ❓ | Team proposal — addresses spam risk while preserving anonymous contribution |
| FR-52 | The system shall support optional user accounts, including sign-in with an existing Microsoft or Google account. | C | ❓ | Team proposal implementing the client's trusted-account concept |
| FR-53 | Records contributed from a confirmed company email domain shall be flagged as affiliated and prioritised for review. | C | ❓ | Team proposal |
| FR-54 | The system shall record dated market events — a change of technology supplier behind a machine brand, an acquisition, or the release of a new automation product — linked to the companies and products they concern, and present them as a reverse-chronological feed. | C | ✅ | CM2 |
| FR-55 | An automated agent shall check a submission against public sources and produce a report assessing each claim — site identity, company roles, technology supplier and machine quantity — as supported, partially supported, contradicted or insufficient evidence, with the source relied on for each and an overall recommendation. The agent shall not alter a record's verification status; the decision remains with a human reviewer. | C | ✅ | CM1 |

---

# 5. Logical data structure

Entities are grouped into reference data, described once and reused, and the facts that reference them. Relationships between companies and sites are many-to-many rather than hierarchical (CM1).

## 5.1 Entity relationship diagram

![Proposed logical data model](../images/erd.png)

The diagram is maintained as Mermaid source in `docs/database/ERD.md`, which the project plan makes normative for enumerations and constraints. The image above is generated from it. Types shown are those of the chosen PostgreSQL and PostGIS implementation; if PostGIS is unavailable, `point_4326` is held as latitude and longitude columns, which serve the point rendering and bounding-box queries the map requires.

\newpage

## 5.2 Entities

### Reference data

| Entity | Purpose |
|-----------------|-------------------------------------------------------------------------------------------------------|
| **Company** | A single table for every organisation — machine manufacturers, technology suppliers, mine owners, operators and contractors. What differs between them is the *role* they hold in a given context, not what they are. |
| **Region** | A named mining region below national level, described once and reused — the Pilbara, the Bowen Basin, Atacama. Held as reference data rather than as text on the site, so that filtering and grouping by region work at all: free text produces several spellings of one region and a filter list nobody can use. A site's country is recorded on the site, since a site may sit in no named region; where a region is given as well, its country and the site's must agree. |
| **Machine model** | A model of machine, described once and reused. For example *Caterpillar 793F*: manufacturer, model, machine type, size class, payload. The model name is nullable, so a contributor who knows only the manufacturer and machine type — *a Caterpillar haul truck* — can still be recorded, with the model added later. |
| **Technology product** | An automation system, described once and reused. For example *Cat Command for Hauling*, *Sandvik AutoMine*, *RCT ControlMaster*. Carries the vendor term as published, and the assigned automation level with its basis. Levels are maintained here by an administrator, never entered by contributors. |

### Facts

| Entity | Purpose |
|---------------------------|---------------------------------------------------------------------------------------------|
| **Deployment** | The central record. A quantity of one machine model, at one site, fitted with one technology product, from a given date. This is what a contributor submits, what a row of the equipment register displays, and what appears in the detail panel of its site marker. |
| **Site–company role** | Associates a company with a site in a stated role. A site typically has several: an owner, an operating subsidiary, and often a mining contractor. |
| **Evidence** | A source supporting a deployment record. |
| **Revision** | The history of a record — who changed it, when, and its previous values. A revision may be made by a contributor or by an administrator, so every change is attributable to whoever made it. |
| **Contributor** | An optional account, holding only an email address and, where offered, an organisation (NFR-09). Not required in order to submit. Domain affiliation is not recorded in the MVP; it arrives only if FR-52 and FR-53 are taken up. |
| **Administrator** | An account authorised to review submissions, verify or reject them, correct records, and maintain reference data such as the automation level held against a technology product. Authenticated by session cookie; no external identity provider is required (FR-45). |
| **Verification review** | One decision on one deployment: who decided, what was decided and why. Append-only, so a record's review history is retained rather than overwritten, and the deployment's current verification status is updated in the same transaction (FR-43, FR-45). |

\newpage

## 5.3 Worked example

One deployment record, in full:

| Field | Value |
|----------------------------|--------------------------------------------------------------------------------------------|
| Site | Roy Hill |
| Machine model | Caterpillar 793F |
| Technology product | Cat Command for Hauling |
| Quantity | 96 |
| Commissioned | 2021 |
| Status | Operational |

The site record carries three company roles — Hancock Prospecting as owner, Roy Hill Holdings as operator, and any contractor engaged. Caterpillar is referenced twice from the one company record, once as manufacturer of the 793F and once as supplier of Cat Command for Hauling.

\newpage
## 5.4 Consequences of this structure

| Requirement | How the structure satisfies it |
|---------------------------------|---------------------------------------------------------------------------------------|
| Headline counts (FR-21) | `Σ deployment.quantity` over the filtered set, with distinct counts of site and country |
| Market share by supplier and by manufacturer (FR-25, FR-26) | Aggregate deployment quantity through technology product and through machine model to the respective company, as a share of the filtered total |
| Share by automation level (FR-29) | Aggregate through technology product to its level. Deployments whose product or level is unknown form a separate unclassified group and are never distributed across the known levels |
| Payload breakdown within a machine type (FR-32) | Machine model carries payload and size class; deployments inherit them |
| Market events feed (FR-54) | Not supported by this structure. Requires a dated event entity linked to companies and technology products |
| Count by company role (FR-33) | Aggregate deployments through site–company role, one role at a time. Where a site has several companies in the same role, as in a joint venture, the deployment counts once against each; the measure is therefore machines at sites in which the company holds that role, not an apportioned share |
| Machine manufacturer separate from technology supplier (FR-02) | Two distinct paths from deployment to company |
| Grouping and filtering by region (FR-12, FR-20) | Region is a reference entity, so every site in a region resolves to one value and the filter list is finite |
| Several companies per site (FR-03) | Site–company role permits any number, each typed. Ownership shares are not held; see Section 7 |
| Equipment relocation (FR-14) | Close the existing deployment with a valid-to date; create a new one |
| Historical view (FR-11, FR-19) | Filter deployments by valid-from and valid-to |
| Varying data completeness (FR-07, FR-08) | Technology product and evidence are both optional on a deployment until it is verified |
| Verified records shown by default (FR-43) | Deployment carries the current verification status; public views filter on it |
| Administrative review (FR-45) | Verification review records each decision against one deployment and one administrator, append-only, so the review history of a record is auditable |
| Correction of records (FR-46) | Revision links to either a contributor or an administrator, so every change is attributable to whoever made it |
| Automated evidence check (FR-55) | Not supported by this structure. Would require further entities for the verification report, its individual claim assessments and the reviewer's decision, added only if FR-55 is taken up |

---

# 6. Non-functional requirements

## 6.1 Accessibility and compatibility

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| NFR-01 | The user interface shall meet the WCAG 2.1 Level AA success criteria for contrast, use of colour, keyboard operation, visible focus and form labelling. Conformance shall be recorded in an accessibility checklist stating how each was tested. | M | ❓ | Team standard |
| NFR-02 | The application shall function correctly in current versions of Chrome and Edge on desktop. | S | ❓ | Team standard |

## 6.2 Security

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| NFR-03 | Requests that create or modify a record shall carry a per-session anti-forgery token, and shall be rejected without a valid one. | M | ❓ | Team standard |
| NFR-04 | Contributed text shall be escaped on output so that submitted content cannot execute as code in another user's browser. | M | ❓ | Team standard |
| NFR-05 | Database queries shall be parameterised. User input shall not be concatenated into a query. | M | ❓ | Team standard |
| NFR-06 | Administration functions shall require authentication. An unauthenticated or unauthorised user shall not be able to view administration data or perform administration actions. | M | ❓ | Team standard, FR-45 |
| NFR-07 | Credentials and service keys shall be supplied by environment configuration and shall not appear in the source repository. | M | ❓ | Team standard |

## 6.3 Data and privacy

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| NFR-08 | The dataset published by the system shall be licensed under Creative Commons, the specific licence to be confirmed. Team proposal: CC BY 4.0. Third-party evidence and media linked from records retain their original copyright and licence. | M | ✅ | BRIEF, C-02 — see Q-10 |
| NFR-09 | The system shall collect from a contributor only an email address and, where offered, an organisation. The submission form shall state what these are used for. | M | ❓ | Team standard |
| NFR-10 | The application source code shall be published under an open-source licence, to be agreed with the client. Team proposal: MIT. | M | ❓ | BRIEF states "IP: Creative Commons (open source)" — see Q-10 |

\newpage

## 6.4 Deployment

| ID | Requirement | Priority | Status | Source |
|---|---|:--:|:--:|---|
| NFR-11 | The application shall run in the hosting environment provided by UWA, using only capabilities that environment offers. | M | ✅ | BRIEF, C-01 — environment capabilities unconfirmed, see Q-4 in Appendix A |
| NFR-12 | The repository shall include setup instructions sufficient for a person outside the team to install and run the application on a Linux host. Any required third-party service, key, usage limit or recurring cost shall be documented. The application shall not depend on a paid service that has not been agreed as a project dependency. | S | ❓ | Team standard |

---

# 7. Out of scope

Recorded explicitly so that scope boundaries are traceable.

| Item | Reason |
|---|---|
| Self-service bulk upload | Few contributors are expected to hold a full dataset. A contact route with manual import is specified instead (CM1) |
| Institutional federated identity (AAF / Shibboleth) | Approximately $4,400 joining fee plus $2,046 per service annually, waived only for Enterprise members, and requiring university sponsorship and security review. OpenID Connect provides the required capability — a confirmed email domain — at no cost. |
| Automated counting of machines from photographs | Not technically sound. A photograph captures what is in frame rather than what is present on site, cannot reliably distinguish automation level, and risks double counting. No labelled dataset for mining equipment exists. |
| Fleet management and dispatch systems (Wenco, Modular Mining, Hexagon) | These schedule and monitor manually operated machines and are not automation products. Recording them as technology suppliers would count manual equipment as automated and inflate adoption figures. |
| Sensor-level detail | The sensor architecture is a property of the technology product, which the system already records. A researcher can obtain it from the supplier's published specification. Recording it here would duplicate public reference data rather than capture anything new (Q-8). |
| Joint-venture ownership percentages | Deployments are counted once against each company holding a role at a site, not apportioned by equity. Shares are disclosed inconsistently and change with corporate transactions, and no requirement depends on them. |
| Forecasting and market projection | A projection is only as good as the series it is built on, and the dataset will be sparse and unevenly verified for some time. A model constructed on it would carry an apparent precision the underlying data cannot support, and a wrong forward number is worse than none — it would be acted on. The people who need these projections are domain experts who already build them, so the lower-risk contribution is a clean, exportable series they can model independently and judge for themselves. Data export (FR-37) serves that (CM2). It is a candidate for a later version, once coverage and verification rates are good enough to support one. |
| Access control by internal role | No requirement for differentiated permissions among readers was identified (CM2). Public read access with an administrative interface is sufficient. |
| Satellite or aerial basemap imagery | Excluded from this release, and a candidate for a later version. Four reasons. Imagery is licensed commercially and billed per request, so it introduces a recurring cost with no owner beyond the semester (Q-4.10). It requires outbound network access and an API key from the hosting environment, neither of which is confirmed (Q-4.6, Q-4.9). Imagery licences generally forbid redistribution, which conflicts with publishing the dataset under Creative Commons (NFR-08). And current imagery of an operating mine site, shown beside a count of the automated machines on it, raises a confidentiality question the project has not put to contributors (A-04). A vector base map answers the question the map exists to answer; imagery would make it more attractive without making it more informative. Where a later version wants imagery, open sources such as Sentinel-2 avoid the licensing and cost objections. |
| Mobile application | Not requested |
| Mine planning or operational control functionality | Outside the product purpose |

---

# 8. Assumptions and dependencies

| ID | Assumption or dependency | Impact if untrue |
|---|---|---|
| A-01 | A representative user exports a subset of an existing installed-equipment database as seed data. This is the project's principal blocker (CM2). | Development and testing proceed against synthetic data, and any market-share measure is meaningless until real records exist |
| A-02 | At least one of BHP, Rio Tinto, RCT or Epiroc will contribute data during the project. | The delivered system launches effectively empty |
| A-03 | The UWA hosting environment permits a containerised web application with a relational database. | Stack choice must change; potential rework |
| A-04 | Industry contributors are permitted by their employers to submit the information the form requests, and are willing to do so. | Contribution volume falls well below expectation, and submissions may be withdrawn |
| A-05 | Enough submissions can be corroborated against published sources for the verified state to mean something. | Most records remain unverified and the distinction stops being useful |
| A-06 | Anonymous submission with an automated-submission challenge is sufficient to control spam without mandatory accounts. | Accounts become mandatory, reducing contribution volume |
| A-07 | Chinese deployments can be identified from Chinese-language sources by a member of the team. | The largest market is systematically under-represented and global figures understate adoption |

---

# Appendix A — Open questions for client confirmation

Every ❓ requirement traces to one of these.

| # | Question | Requirements affected | Answer |
|---|---|---|---|
| Q-1 | **Answered (CM2).** Teleremote equipment is in scope, and is recorded as its own automation level. | FR-08, FR-09 | Closed |
| Q-1a | **Is the four-level scale acceptable?** Three levels were set as a minimum. The team proposes four — line-of-sight remote, teleremote, semi-autonomous, autonomous — because two suppliers publish ladders at this granularity (REF-4, REF-5) and the market analysis described in CM2 depends on distinguishing line-of-sight from semi-autonomous. Definitions are in Section 2.6, against ISO 17757 and the GMG levels, and would be published with the dataset. | Section 2.6, FR-09 | |
| Q-2 | **Must a contributor hold an account to submit**, or are anonymous submissions accepted? | FR-40, FR-52, FR-53 | |
| Q-3 | **Who may correct an existing record** — any user, or only its original contributor? | FR-46, FR-47, FR-48 | |
| Q-4 | **What is meant by a UWA IT environment, what does it provide, and who can tell us?** The brief requires deployment within a UWA IT environment as far as practical, which could mean any of three things: hosted on hardware UWA operates; hosted on a cloud subscription UWA holds and pays for; or hosted anywhere, provided it satisfies UWA policy on security, data handling and domain use. The three differ in what may be installed, who administers the host, who is billed, and what review is required before going live. The checklist below sets out the detail once the reading is settled. If the client does not hold these answers, the name of someone in UWA IT who does would be enough. | NFR-11, C-01, stack selection | |
| Q-5 | **What is the minimum field set for a publishable record?** Team proposal: mine site; machine model, or manufacturer and machine type; quantity; and technology product where known. Automation level is not requested from the contributor — it is derived from the technology product during review, per Section 2.6. | FR-07, FR-08, FR-40 | |
| Q-6 | **Is the MoSCoW prioritisation in Section 4, reproduced in Appendix B, agreed?** | All | |
| Q-7 | **When will seed data be available?** | A-01, A-02 | |
| Q-8 | **Is sensor-level detail required in the dataset?** Raised as a research interest in CM1. Team proposal is to exclude it: sensor architecture is a published property of the technology product, which the system already records, so a researcher can obtain it from the supplier's specification. | Section 7 | |
| Q-9 | **Should machine model, technology product and region be entered as free text or selected from a controlled list?** Team proposal: a controlled list that contributors may extend, with duplicate entries merged by an administrator. Regions in particular need this, since they are a filter and free text would produce several spellings of the same region. | FR-01, FR-02, Section 5 | |
| Q-10 | **Two licences are required, and the brief specifies one.** Creative Commons covers the dataset but is not intended for software, so the application needs its own licence. Team proposal: **CC BY 4.0** for the dataset — attribution required, reuse otherwise unrestricted, so a startup or researcher can build on it — and **MIT** for the source code, being short, permissive and the least obstacle to UWA reusing or continuing the work. If returning improvements matters more than ease of reuse, the alternatives are CC BY-SA 4.0 and AGPL 3.0. | NFR-08, NFR-10 | |
| Q-11 | **Is the product public, or a supplier's internal dashboard?** Access control by role was judged unnecessary on the basis that readers would all be internal to one organisation (CM2). The project is specified as a public, crowdsourced, openly licensed database. If a representative user expects a private view of their own market position, that is a different product and should be settled now. | NFR-08, C-02, dataset scope |
| Q-12 | **Is satellite or aerial imagery expected on the map?** It is excluded from this release for cost, licensing, network and confidentiality reasons set out in Section 7, and a vector base map is proposed instead. If imagery is expected, it changes the hosting and licensing position and should be raised now rather than in October. | Section 3.3, Section 7 |
| Q-13 | **Is a market events feed wanted, and who maintains it?** Changes of technology supplier behind a machine brand, and releases of new automation products, were identified as things currently learned too late (CM2). Recording such events is straightforward; keeping them current is an editorial commitment beyond the semester. | FR-54 |

## A.1 Hosting environment checklist

To be answered by the client or UWA IT. Each item constrains a specific design decision.

| # | Question | What it determines |
|---|---|---|
| 4.1 | What form does the environment take — a dedicated virtual machine, shared web hosting, or a cloud subscription held under a UWA account? | What is installable, who administers the host, and who is billed |
| 4.2 | Is shell access with administrative rights available? | Whether anything can be installed |
| 4.3 | Are containers (Docker) permitted? | Deployment approach and portability |
| 4.4 | Is PostgreSQL available, and can the **PostGIS** extension be installed? | Whether geospatial queries run in the database or must be handled in application code |
| 4.5 | Is file or object storage available for uploaded documents and images? | Future extension only. The MVP holds evidence and media as links (FR-44, FR-49); storage is required only if direct upload is added later |
| 4.6 | **Is outbound internet access permitted from the server?** | Map tiles, search services and any language-model API. If egress is blocked, the automated evidence check (FR-55) is impossible regardless of effort, and map tiles must be self-hosted |
| 4.7 | Will the site be publicly reachable, or restricted to the UWA network? | Whether external contributors can reach it — the crowdsourcing model depends on public access |
| 4.8 | Is a domain name and TLS certificate provided? | Public availability, and sign-in with external identity providers |
| 4.9 | How are secrets such as API keys stored? | Whether third-party services can be used safely |
| 4.10 | Is there a budget to run and maintain the system after handover, and who holds it? | Whether third-party services carrying a recurring cost can be depended on. Optional sign-in (FR-52) and the automated evidence check (FR-55) require them; without a budget owner both lapse after the semester |
| 4.11 | Who provisions the environment, who administers it afterwards, and what is the lead time? | Delivery schedule and a named contact for the questions above; a long lead time is a scheduling risk |

**Dependency note.** Items 4.6, 4.7 and 4.10 are critical. If outbound access is blocked, if the site is not publicly reachable, or if no budget exists for third-party services, then optional sign-in (FR-52) and the automated evidence check (FR-55) become undeliverable, and the crowdsourcing model itself is compromised.

---

# Appendix B — Scope confirmation checklist

*For completion with the client. Records agreement on what will be delivered this semester, and what will not. Each item may be accepted or amended.*

- **Meeting:** ....................
- **Client:** Dr Adrian Boeing
- **Representative users:** RCT Global · Epiroc

| Priority | Meaning |
|---|---|
| **Must** | Committed. The project is not complete without it. |
| **Should** | Intended. Delivered unless something goes wrong. |
| **Could** | Not committed. Delivered only if the Must and Should items complete early. |
| **Won't** | Excluded from this semester. |

## B.1 What the system records

| | Item | Requirements | Agreed? |
|---|---|---|---|
| Must | Deployments linked to a mine site — machine model, manufacturer, machine type, quantity, technology product | FR-01 | ☐ yes ☐ amend |
| Must | Machine manufacturer and technology supplier held separately | FR-02 | ☐ yes ☐ amend |
| Must | Any number of companies per site, each with a role — owner, operator, contractor | FR-03 | ☐ yes ☐ amend |
| Must | Mine sites — name, coordinates, commodity, and the mine's own operating status | FR-04 | ☐ yes ☐ amend |
| Must | Commissioning date, and deployment status — announced, commissioning, operational, decommissioned | FR-05 | ☐ yes ☐ amend |
| Must | Surface and underground machine types — haul trucks, LHDs, dozers, drills, scalers, shotcrete machines | FR-06 | ☐ yes ☐ amend |
| Must | A record is accepted once a minimum field set is present; everything else optional | FR-07 | ☐ yes ☐ amend |
| Must | Only equipment with an automation product fitted is in scope | FR-08 | ☐ yes ☐ amend |
| Must | Four automation levels — line-of-sight remote, teleremote, semi-autonomous, autonomous — held against the automation product, not entered by contributors | FR-09 | ☐ yes ☐ amend |
| Must | Surface or underground recorded per deployment | FR-10 | ☐ yes ☐ amend |
| Must | Valid-from and valid-to dates, so a past state can be reconstructed | FR-11 | ☐ yes ☐ amend |
| Should | Grouping by mine site, region and country, region from a maintained list | FR-12 | ☐ yes ☐ amend |
| Should | Machine size class, maximum payload, operating weight | FR-13 | ☐ yes ☐ amend |
| Should | Equipment marked decommissioned rather than deleted; relocation creates a new record | FR-14 | ☐ yes ☐ amend |

## B.2 Map

| | Item | Requirements | Agreed? |
|---|---|---|---|
| Must | One marker per mine site, at its location | FR-15 | ☐ yes ☐ amend |
| Must | Deployment status distinguished on each marker | FR-16 | ☐ yes ☐ amend |
| Must | Site detail on selection | FR-17 | ☐ yes ☐ amend |
| Must | Filter by technology supplier | FR-18 | ☐ yes ☐ amend |
| Must | Time control — see the map as it stood at any past date | FR-19 | ☐ yes ☐ amend |
| Should | Filter by country, region, machine type, automation level, commodity, surface or underground | FR-20 | ☐ yes ☐ amend |

## B.3 Analytics

| | Item | Requirements | Agreed? |
|---|---|---|---|
| Must | Headline counts — automated machines, sites, countries | FR-21 | ☐ yes ☐ amend |
| Must | Cumulative machines in service over time | FR-22 | ☐ yes ☐ amend |
| Must | Machine count by country | FR-23 | ☐ yes ☐ amend |
| Must | Machine count by machine type | FR-24 | ☐ yes ☐ amend |
| Must | Market share by technology supplier | FR-25 | ☐ yes ☐ amend |
| Must | Market share by machine manufacturer | FR-26 | ☐ yes ☐ amend |
| Must | Filters applying to every measure — country, region, machine type, manufacturer, supplier, automation level, commodity, surface or underground | FR-27 | ☐ yes ☐ amend |
| Must | Aggregate measures only; individual records are served by the register and export | FR-28 | ☐ yes ☐ amend |
| Should | Share of machines at each automation level, overall and by country | FR-29 | ☐ yes ☐ amend |
| Should | Machines newly commissioned each year | FR-30 | ☐ yes ☐ amend |
| Should | Within a machine type, manufacturers and suppliers ranked by machine count | FR-31 | ☐ yes ☐ amend |
| Should | Within a machine type, breakdown by payload class | FR-32 | ☐ yes ☐ amend |
| Should | Machine count by company role | FR-33 | ☐ yes ☐ amend |
| Could | Compound annual growth rate by country | FR-34 | ☐ yes ☐ amend |
| Could | User-arranged dashboard | FR-35 | ☐ yes ☐ amend |

## B.4 Equipment register and export

| | Item | Requirements | Agreed? |
|---|---|---|---|
| Must | Searchable, filterable, sortable register | FR-36 | ☐ yes ☐ amend |
| Must | Export in a flattened tabular format | FR-37 | ☐ yes ☐ amend |
| Should | Machine model detail — attributes and the deployments using it | FR-38 | ☐ yes ☐ amend |
| Could | Link from a machine model to the manufacturer's product page | FR-39 | ☐ yes ☐ amend |


\newpage
## B.5 Contribute

| | Item | Requirements | Agreed? |
|---|---|---|---|
| Must | Submission form; records published immediately | FR-40, FR-42 | ☐ yes ☐ amend |
| Must | Notice that contributors may submit only what they are permitted to disclose | FR-41 | ☐ yes ☐ amend |
| Must | Verification status, with verified records shown by default | FR-43 | ☐ yes ☐ amend |
| Must | Evidence links attached to records | FR-44 | ☐ yes ☐ amend |
| Must | Administration screen for review | FR-45 | ☐ yes ☐ amend |
| Must | Correction of existing records | FR-46 | ☐ yes ☐ amend |
| Should | Revision history, with reversion | FR-47, FR-48 | ☐ yes ☐ amend |
| Should | Linked media — case studies, articles, video | FR-49 | ☐ yes ☐ amend |
| Should | Contact route for bulk contributions, imported manually | FR-50 | ☐ yes ☐ amend |
| Should | Automated-submission challenge to control spam | FR-51 | ☐ yes ☐ amend |
| Could | Sign-in with Microsoft or Google, confirming email domain | FR-52, FR-53 | ☐ yes ☐ amend |
| Could | Market events feed — supplier changes, acquisitions, new products | FR-54 | ☐ yes ☐ amend |
| Could | Automated evidence check, with human approval | FR-55 | ☐ yes ☐ amend |

## B.6 Excluded this semester

*Each of these is a deliberate boundary, not an oversight. Section 7 of the specification gives the full reasoning.*

| Item | Reason | Agreed? |
|---|---|---|
| Self-service bulk upload | Few contributors are expected to hold a full database; a contact route with manual import is better value | ☐ agreed ☐ amend |
| Institutional single sign-on via AAF | Approximately $4,400 to join plus $2,046 per service annually, and requires university sponsorship. Sign-in with Microsoft or Google gives the same confirmed email domain at no cost | ☐ agreed ☐ amend |
| Counting machines from photographs | A photograph captures what is in frame, not what is on site, and cannot distinguish automation level | ☐ agreed ☐ amend |
| Fleet management and dispatch systems as automation suppliers | Wenco, Modular Mining and Hexagon schedule and monitor manually operated machines. Recording them as automation suppliers would count manual equipment as automated | ☐ agreed ☐ amend |
| Sensor-level detail | Sensors are a property of the automation product, which we already record, so the list can be read from the supplier's own specification — see question 8 | ☐ agreed ☐ amend |
| Joint-venture ownership percentages | Where a site has several owners, a machine is counted against each rather than split by equity share. Percentages are published inconsistently and change with deals | ☐ agreed ☐ amend |
| Forecasting and market projection | A projection built on a sparse dataset would look more precise than the data warrants, and a wrong forward number gets acted on. Your analysts are the domain experts and already build these; the safer contribution is a clean exportable series they can model themselves. Worth revisiting for a later version once the dataset is dense enough to carry it | ☐ agreed ☐ amend |
| Access control by role | The site is public to read, with an administration screen behind sign-in. No differentiated permissions among readers | ☐ agreed ☐ amend |
| Satellite or aerial map imagery | Licensed per request, so it carries a recurring cost with no owner after handover; the licences generally forbid redistribution, which conflicts with publishing the data openly; and imagery of an operating site beside a machine count raises a confidentiality question. A candidate for a later version — see question 12 | ☐ agreed ☐ amend |
| Mobile application | Not requested | ☐ agreed ☐ amend |
| Mine planning or operational control functionality | Outside the purpose of the product | ☐ agreed ☐ amend |

## B.7 Further comments

*Anything missing, or that would make the system more useful.*

| |
|---|
| |
| |
| |

## B.8 If time runs short

*If delivery must be reduced, rank the four functions in order of importance, 1 being the most important.*

| Function | Rank |
|---|---|
| Interactive GIS map | |
| Analytics dashboard | |
| Queryable equipment register | |
| Verified crowdsourcing | |

\vspace{1em}

**Our view:** all four will be built, and this order applies only if we have to cut something.

1. **Equipment register** — the dataset and the means of querying it; the other three depend on it
2. **Verified crowdsourcing** — the mechanism by which the dataset is built and corrected
3. **Interactive map** — a geographic presentation of the records the register holds
4. **Analytics dashboard** — aggregate measures derived from those same records; data export (FR-37) serves the same analytical need until it is delivered

Your ranking above takes precedence.

\vspace{4em}

- **Agreed by:** ............................................
- **Date:** ....................
