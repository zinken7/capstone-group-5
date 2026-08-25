<!--
Section 2. Client Communication and MVP Agreement
Owner: M2 (Hans Lionar)

Marking rubric, Exceptional:
"Evidence of good communications with the client and other stakeholders;
 Client has approved MVP and any other deliverables to date"

Headings carry no manual numbers: the build runs --number-sections.
Reference [1] is the 11 August client and representative user meeting (CM2).
-->

# Client Communication and MVP Agreement

The team treats client contact as the mechanism by which requirements are
corrected, not as reporting. A written agenda or question set is prepared
before each contact, and every meeting is recorded, minuted and committed to
the repository, so that the client's own words remain the source for every
requirement traced to them. The forward communication protocol, including
meeting cadence and escalation, is set out in Section 3; this section records
what has been communicated, what the team is proposing, and what remains
unconfirmed.

## Stakeholders

Commissioning the system and using it are different roles [2], and the requirements come
from both.

| Stakeholder | Interest in the project | How engaged |
|------|--------|------|
| Dr Adrian Boeing (UWA), Client | Set the brief, commissioned the work and defines what success means; will use the dataset himself, as a researcher; sets the constraints on technology and licensing, and holds the system after handover | Meetings, email and MS Teams. At his request every group member is copied on correspondence rather than contact passing through one person [2] |
| Yash Singh (RCT Global), Market Data Analytics | Representative user. Works with the market data this system is meant to produce, and a source of both terminology and seed data | Requirements elicitation meeting, 11 August [1] |
| Milan Ivovic (Epiroc), Regional Business Manager, Asia Pacific | Representative user. Depends on market intelligence for commercial decisions in a region the dataset must cover | Requirements elicitation meeting, 11 August [1] |
| Fudong Qin (UWA), Unit Facilitator | Monitors progress on behalf of the unit, and advises on process and engineering practice | Fortnightly facilitator meetings; copied on client correspondence as evidence [8] |
| Group 15 | Delivers the same brief in parallel, and shares both the client's time and the same elicitation meetings | Shared client meetings; the group is identified explicitly in all correspondence to avoid confusion between the two [2] |
| Teaching team | Unit administration and assessment | Dedicated unit and group channels in MS Teams; questions raised in person with the unit coordinator during class |
| Public / downstream users | The dataset is intended to be openly licensed, with CC BY 4.0 proposed for the data and MIT for the source code [7], so that others may reuse both. Startups, smaller suppliers and researchers priced out of commercial market reports are the intended beneficiaries [2] | Not engaged directly this semester. Their interests are carried by the client, who commissioned the system for that purpose, and tested against the representative users |

Dr Boeing is both the commissioning party and a user of the dataset: as a
researcher in autonomous mining equipment he has an interest in the technical
approach as well as in the resulting data, and he nominated three existing
systems as reference models for the map and the crowdsourced submission
mechanism [2]. He also determines the constraints within which the system is
built.

The two representative users were engaged because their roles impose
different requirements. Yash Singh works in market data analytics, tracking
market share monthly and product roadmaps quarterly; his requirement is
coverage and recency, since he needs to see a competitor gaining ground early
rather than after the fact [1]. Milan Ivovic holds commercial
responsibility for a region; his requirement is depth, since he advises a
mine operator by comparing their site with another where the same technology
already works, and a record only serves that if it holds what makes two sites
comparable: the commodity, whether the site is surface or underground, and the
machines and technology installed [1]. Meeting them alongside the client in a
single session shortened the process, since the client held a settled view of
what he wanted while the representative users supplied the industry
perspective against which it could be tested.

## Communication Record

| Date | Contact | Participants | Purpose and outcome | Evidence |
|---|------|--------|----------------------|---------|
| 23 Jul | First contact | Group 5 → client, all group members copied | The group requested a first meeting by email, with a link to its availability. A follow-up was sent on 28 July. The client replied on 31 July with a calendar invitation for an in-person meeting on 6 August, and undertook to arrange a separate meeting with an industry partner | Correspondence log |
| 5 Aug | Question bank issued | Group 5 → client | Circulated in advance, structured around the four areas the project had to settle: the problem, the MVP boundary, ways of working, and technical constraints | [`meeting_questions.md`](https://github.com/zinken7/capstone-group-5/blob/main/docs/meeting_questions.md) |
| 6 Aug | Client Meeting 1, in person | Dr Boeing, Group 5 | Problem, users, data model and provisional MVP boundary; the team demonstrated a single-page prototype dashboard | [CM1 minutes](https://github.com/zinken7/capstone-group-5/blob/main/docs/meeting_minutes/2026-08-06-client-meeting-1.md) [2] |
| 7 Aug | Facilitator Meeting 1, online | Fudong Qin, Group 5 | Process expectations: define the MVP early and agree it with the client; minute every meeting and rotate the role; copy the facilitator on client correspondence as evidence | [FM1 minutes](https://github.com/zinken7/capstone-group-5/blob/main/docs/meeting_minutes/2026-08-07-facilitator-meeting-1.md) [8] |
| 11 Aug | Requirements elicitation, online | Dr Boeing, Yash Singh (RCT Global), Milan Ivovic (Epiroc), Group 5, Group 15 | The team demonstrated the working prototype and the screen mockups, and took field-level and workflow requirements from the representative users against them. Scope decisions recorded in Section 2.3 | [CM2 minutes](https://github.com/zinken7/capstone-group-5/blob/main/docs/meeting_minutes/2026-08-11-client-meeting-2.md) [1] |
| 12 Aug | Specification, scope checklist and prototype issued | Group 5 → client, facilitator and all group members copied | Requirements specification, MVP scope checklist and the interactive prototype rebuilt from the meeting mockups (PR #4), sent by email and flagged on MS Teams, identifying the two answers most needed if time was short, the scope checklist and the UWA environment question, and offering to walk the client through either document. No response received | Appendix B of [7]; [prototype](https://github.com/zinken7/capstone-group-5/blob/main/docs/ui/prototype.html); Correspondence log |
| 13 Aug | Advice sought | Group 5 → unit coordinator and facilitator | Position set out and advice requested on whether the report could proceed on documented assumptions or whether a signed agreement on the MVP scope was required. Directed to continue following up with the client, and to prepare the report without waiting and revise it once confirmation arrives. A one-week extension was granted | Correspondence log |
| 14 Aug | Follow-up and progress update | Group 5 → client; Group 5 → unit channel | Confirmation of the scope checklist requested again by MS Teams, and a progress update posted to the unit channel | Correspondence log |
| 18 Aug | Facilitator Meeting 2, online | Fudong Qin, Group 5 | Progress reported, including the outstanding client confirmation. Facilitator directed the team to keep pursuing the client and settle the MVP early. Confirmed that the technology stack may be revised later if the reason and trade-off are documented | [FM2 minutes](https://github.com/zinken7/capstone-group-5/blob/main/docs/meeting_minutes/2026-08-18-facilitator-meeting-2.md) [34] |
| 19 Aug | Follow-up and offer of a call | Group 5 → client, facilitator and all group members copied | Reply sent on the email thread and by MS Teams, restating the request after the deadline extension and offering a call, with an availability link, so that the checklist could be worked through together | Correspondence log |
| 25 Aug | Report issued for approval | Group 5 → client, facilitator and all group members copied | The submitted report sent into the same thread, with the MVP scope in Section 2.3 put forward for approval and a request that any item requiring change be identified | Correspondence log |

Every record above is held in the project repository at
<https://github.com/zinken7/capstone-group-5>. Each contact is recorded in the
correspondence log at
[`docs/correspondence-log.md`](https://github.com/zinken7/capstone-group-5/blob/main/docs/correspondence-log.md),
with its date, channel, recipients and outcome.

Every meeting is minuted from the recording, with actions, owners and dates,
and the minute-taking role rotates as the facilitator directed [8]. Every
requirement in the specification cites the contact it came from, so a claim
about what the client wants can be checked against the source rather than
taken on trust.

During a meeting the team listens first. A question bank is prepared
beforehand, but the questions are held in reserve, since a stakeholder's own
account answers many of them. The bank then closes the ambiguity that remains, so that a requirement
is stated precisely enough either to be built or to be refused. The team then
recommends, declining what the project should not attempt and naming the risk
of attempting it; Section 2.3 records one such case.

Where the team's own understanding is put forward, it is put forward in a form
that is easy to contradict: the interface is shown as a working prototype
rather than described in prose, and the requirements specification sets its
unresolved points out as a numbered list of questions rather than leaving them
implicit. In each case the intent is to elicit correction rather than assent.

## MVP Scope

Scope is prioritised by MoSCoW: **Must** is committed, **Should** is intended,
**Could** is delivered only if the committed scope completes early, and
**Won't** is excluded this semester. The full item-level checklist is Appendix
B of the requirements specification [7]; the table below is the boundary it
defines.

| Function | Must | Should | Could |
|--------|-----------------|-------------|------------|
| **Map** | Site markers with deployment status; site detail with the equipment and technology supplier recorded there; filter by technology supplier; time slider showing deployments in service at a chosen date | Further filters: country, region, machine type, automation level, commodity, surface or underground | |
| **Analytics** | Headline statistics; cumulative machines in service over time; counts by country and by machine type; share by technology supplier and by manufacturer; filters applying to every measure | Share by automation level and by company role; machines newly commissioned each year | User chooses which measures are displayed |
| **Equipment register** | Data model covering companies, sites, machine models, technology products and the deployments linking them; four automation levels; searchable and sortable register; export of the dataset | Machine model detail listing the deployments using it | Link from a machine model to the manufacturer's page |
| **Contribution and verification** | Submission form with immediate publication; verification status with verified records shown by default; evidence links; administration screen for review; correction of records; disclosure notice | Revision history with reversion; bulk contribution by arrangement; linked media | Sign-in with Microsoft or Google; automated evidence check |

The boundary was set by need rather than by request. Both representative users
asked for more than a semester allows, including a feed of market events such
as acquisitions and new product launches, dashboards configurable per user,
and comparison of one mine site against similar ones [1]. An item was
committed as *Must* only where the client stated it and the product is
incomplete without it. Requests that depend on an unresolved question, on a
budget owner, or on data the project may not receive were recorded as *Should*
or *Could*, or carried in the backlog, so that they remain visible without
being promised.

The following are excluded this semester. A reason is recorded in each case so
that the boundary is traceable [7, Sec. 7].

- **Self-service bulk upload.** Few contributors are expected to hold a full
  dataset, and a manual import is better value.
- **Sensor-level detail.** It is a published property of the technology
  product, which the system already records.
- **Joint-venture ownership percentages.** Shares are disclosed inconsistently
  and no requirement depends on them.
- **Fleet management and dispatch systems.** These schedule manually operated
  machines, so recording them would inflate adoption figures.
- **A mobile application.** Not requested.
- **Market forecasting.** Requested at the elicitation meeting, where the
  representative user asked whether the system could project adoption two years
  forward by combining the historical trend with mining companies' published
  forecasts. The team declined on two grounds: producing an economic projection
  is the work of a financial analyst rather than of this team, and a projection
  built on incomplete data would undermine confidence in the dataset itself. It
  offered instead the two capabilities an analyst needs to produce one, a time
  control for viewing a chosen date range and export of the dataset. The client
  accepted this in discussion [1].

## Agreement Status and Open Questions

No part of the scope in Section 2.3 has been approved by the client.
Preferences expressed by the representative users during the elicitation
meeting are recorded in the transcript and the minutes, but discussion is not
approval, and nothing has been confirmed in writing.

**Confirmation has been pursued through every available channel.** The scope was
issued by email on 12 August 2026 as a checklist in which every item carries an
accept or amend option, so that it can be answered without drafting a reply
[7, App. B]. A message on MS Teams the same day flagged the email and identified
the two answers most needed if time was short: the checklist itself, and the
question about the UWA hosting environment. Follow-ups were sent by MS Teams on
14 August and by both email and Teams on 19 August, Teams being the route the
client asked the team to use when email is slow [2]; the second offered a call,
with an availability link, so that the checklist could be worked through
together. This report is submitted into the same email thread. Every contact is
recorded in the correspondence log with its date, channel and outcome.

**The position was escalated within the unit.** Advice was sought from the unit
coordinator and the facilitator on whether the report could proceed on
documented assumptions, or whether a signed agreement on the MVP scope was a
requirement. The guidance was to continue following up with the client, to
prepare the report without waiting, and to revise it once confirmation arrives;
a one-week extension was granted on that basis. The team also verified that the
delay is not particular to its own correspondence, by checking with the project
manager of Group 15, which works to the same brief with the same client. Client
availability was identified as a project risk in the first week rather than 
encountered as a surprise: the group's first meeting request, sent on 23 July, 
required a follow-up before it was answered. It is carried as R-01 in Section 4.

**Section 2.3 is therefore a proposal awaiting validation.** It is drawn from
the two client meetings, the requirements elicitation with the representative
users, and the written brief, and each requirement in the specification records
the contact it came from [7]. What is outstanding is confirmation rather than
further elicitation: a walkthrough of the checklist and the client's signature
against it. Obtaining that signed agreement is the team's first priority and
will be pursued as soon as contact is re-established, as directed by the unit
coordinator.

**Work proceeds meanwhile.** Where a decision is needed and no answer has
arrived, the team adopts the option proposed in the requirements specification,
records it as an assumption with the date it took effect and the work it
affects, and raises it at the next client contact. No committed task depends on
an unanswered question, so the foundation work in Sprint 1 continues. The
assumptions in force are listed below.

| Question | Assumption in force | From | Work affected |
|-----------|---------------|-----|--------------|
| Q-1a. Is the four-level automation scale acceptable? | Four levels implemented as specified: line-of-sight remote, teleremote, semi-autonomous, autonomous | 22 Aug | Schema enumeration; every view that filters by automation level |
| Q-4. What does the UWA hosting environment provide? | Deployment plan written to accommodate each possible answer; staging serves demonstrations until the environment is known | 18 Aug | Deployment approach, Section 3 |
| Q-2, Q-3. Are accounts required to submit, and who may correct a record? | Anonymous submission accepted; any user may propose a correction, which returns the record to pending review | Sprint 3 planning | Contribution and verification |
| Q-7. When will seed data be available? | A documented synthetic dataset is built in Sprint 1 | 18 Aug | Demonstrations and analytics |
| Q-10. Which licences apply? | CC BY 4.0 for the dataset, MIT for the source code | Handover | Repository licensing |

Each assumption is listed in the requirements specification against the
requirements it affects [7, App. A], and each is raised explicitly at the
next client contact rather than left to stand by default.