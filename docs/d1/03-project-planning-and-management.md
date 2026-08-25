# Project Planning and Management

<!-- Section 3. Owner: Hans (M2). Page target 1.5pp.

     Target mark: Exceptional. The rubric describes it as:
       "Project plan is realistic and contains sufficient detail for each team
        member to work on the next deliverable. Responsibilities and deadlines
        are documented. Project tools are set up and show evidence of
        effective planning for group workflow and software deployment."

     Where each clause is answered:
       - tools and workflow, in Project Management Tools and Team Workflow;
       - software deployment, in Deployment Plan;
       - responsibilities, in Roles and Responsibilities;
       - deadlines, in Milestones and Deadlines;
       - detail for each member, in Next Deliverable: Sprint 1 Assignments.

     If over budget, remove the deployment environment table but keep the
     contingency list and the Sprint 1 assignment table. -->

Delivery is organised as four two-week sprints, running from week 5 to the
final report on 13 October, each concluding with a working increment deployed
to staging. The GitHub repository holds the live planning artefacts, which
this section summarises.

## Project Management Tools

| Tool | Used for | Rationale |
|---|---|---|
| [GitHub](https://github.com/zinken7/capstone-group-5) | Source control, task assignment and tracking on a project board, sprint milestones, peer review, continuous integration and deployment, and all project documentation | Issues and milestones were adopted in preference to a separate tracking tool so that the plan, the documentation and the source share a single history and review trail. The client and facilitator can be given read access to the repository itself, so no further tool is required of them. |
| Mermaid | Diagrams that must remain consistent with the implementation: the entity-relationship diagram, and state or sequence diagrams where required | Maintained as code, these diagrams are versioned and reviewed within the same pull request as the change they document, so revisions are explicit to reviewers. An exported image cannot be compared between versions, and becomes outdated without detection. |
| draw.io | Diagrams in which the arrangement itself conveys meaning: system architecture, deployment topology and interface wireframes | Composed layout is necessary where grouping and position are the substance of the diagram, which Mermaid's automatic layout cannot express. Diagrams are exported and committed to the repository, so that no artefact depends upon a hosted account. |
| [MS Teams](https://teams.microsoft.com/l/channel/19%3AU6vFWzetYOSthlFpBILy6ejAUNHR47a8rWkvEDBNuw01%40thread.tacv2/General?groupId=4259f431-6994-4e09-90b6-cac70831356a&tenantId=05894af0-cb28-46d8-8716-74cdb46e2226) | A group chat for day-to-day coordination; the unit and [Group 5](https://teams.microsoft.com/l/channel/19%3AfvBJwIlvNLIFMkJIF_iFXR2U_5aoDH6Dy1oAl_S1FJI1%40thread.tacv2/Group%205?groupId=4259f431-6994-4e09-90b6-cac70831356a&tenantId=05894af0-cb28-46d8-8716-74cdb46e2226) channels for facilitator and academic correspondence | The client, facilitator and teaching team all work in Teams, and the unit provides the group channel, so correspondence held there is retained and searchable by default rather than dispersed across individual inboxes. Teams also hosts the online client and facilitator meetings, and its recordings and transcripts provide the basis for the minutes. |

## Team Workflow

- **Task assignment.** Tasks are assigned and tracked on a GitHub Projects
  board, each issue carrying an assignee and the milestone for its sprint
  [11]. A pull request stating `Closes #n` closes its issue on merge, which
  moves the card to Done, so board status reflects the repository rather than
  manual upkeep. The board is reviewed at the weekly team meeting.
- **Branching.** The team follows trunk-based development [12]: `main` is
  protected, always deployable and never committed to directly. Work is
  carried out on short-lived branches named
  `<type>/<issue-number>-<short-name>`, for example
  `feat/12-deployment-read-api`, so that a branch, an issue and a pull request
  denote the same unit of work. Branches are deleted once merged.
- **Commits.** Commit messages follow the Conventional Commits specification
  [13]: `<type>(<scope>): <description>`, for example `feat(api): add
  deployment read endpoint`. Squash merges append the pull request number
  automatically, so history records the area, the change and its origin.
  Branch prefixes use the same type vocabulary.
- **Review.** Branch protection requires every change to reach `main` through
  a pull request with at least one approving review from a member outside the
  relevant area and a passing CI run. A pull request template records what
  changed, the issue it closes and how it was tested.
- **Definition of done.** The Scrum Guide requires each team to define its own
  [10]. Ours: merged to `main`, CI passed, running on staging, the acceptance
  criteria in the issue demonstrably met, and affected documentation updated
  in the same pull request.
- **Meetings.** A standing weekly client meeting on Thursdays at 10:00 will be
  proposed at the next client contact, since frequent contact improves the fit
  of what is delivered. The team meeting follows at 11:00 whether or not the
  client meeting is taken up. The facilitator meeting is fortnightly, Tuesdays
  at 16:30, from 18 August.
- **Client contact.** Email in the first instance, followed by a Teams message
  if no response arrives within one day, as agreed on 6 August. The
  facilitator is copied on every client email, as he requested.
  [Minutes](https://github.com/zinken7/capstone-group-5/tree/main/docs/meeting_minutes)
  are committed within 24 hours by the rotating note-taker. Where an answer is
  needed and none arrives, the team proceeds on a documented assumption and
  confirms it retrospectively.
- **Escalation.** Any item blocked for more than two working days is raised in
  the team channel and referred to the client or facilitator rather than
  absorbed by the member concerned.

[`CONTRIBUTING.md`](https://github.com/zinken7/capstone-group-5/blob/main/CONTRIBUTING.md)
records the team working conventions in full, covering type and scope
vocabularies and the issue and pull request templates.

## Roles and Responsibilities

All members hold equal standing, and decisions on scope, architecture,
technology and design are agreed by the team. Following the responsibility
assignment matrix convention [9], each area names one accountable member,
answerable for the work being completed, tested, documented and ready for
integration, while any member may contribute to any area.

| Code | Member | Role | Primary area |
|---|---|---|---|
| M1 | Tyrone Tran (24814799) | DevOps and AI integration | Repository configuration, CI/CD, deployment environments, system integration, LLM verification and RAG pipeline |
| M2 | Hans Lionar (24661999) | Project coordination and business analysis | Requirements, planning and task allocation, client communication, project documentation and risk register, quality assurance |
| M3 | Zerun Zhang (24389925) | Backend development and API testing | Backend services, application logic, REST APIs, verification workflow, automated API tests |
| M4 | Zunhao Zhang (24758673) | Database development and data integration | Entity-relationship model and migrations, PostGIS and spatial queries, data ingestion and quality, evidence metadata, database testing and performance |
| M5 | Shee Wang (24368932) | Front-end, GIS and analytics | Public interface, interactive GIS map, analytics dashboard, submission and moderation interfaces, report interfaces |
| M6 | Hengan Weng (24201874) | Front-end, quality assurance and RAG evaluation | Front-end support, system and accessibility testing, RAG and report-accuracy evaluation, user and administrator guides, demonstration preparation |

Each member reports weekly on work completed, evidence, blockers and planned
tasks. M2 compiles these into the accountability document held in the [Group 5
Teams
channel](https://teams.microsoft.com/l/channel/19%3AfvBJwIlvNLIFMkJIF_iFXR2U_5aoDH6Dy1oAl_S1FJI1%40thread.tacv2/Group%205?groupId=4259f431-6994-4e09-90b6-cac70831356a&tenantId=05894af0-cb28-46d8-8716-74cdb46e2226),
which the unit coordinator, the facilitator and the teaching team can access.

[`docs/accountability.md`](https://github.com/zinken7/capstone-group-5/blob/main/docs/accountability.md)
records the detailed responsibilities and deliverables held by each member.

## Milestones and Deadlines

The unit calendar places the final group report and showcase in week 12, on 13
October, leaving four sprints from week 5.

| Period | Dates | Milestone |
|---|---|---|
| Weeks 1–4 | 21 Jul – 17 Aug | Completed: project allocation; client and facilitator meetings; requirements elicitation with RCT Global and Epiroc; interactive prototype; draft MVP scope sent to the client; requirements analysis and specification [7] |
| Sprint 1 | Weeks 5–6 · 18–31 Aug | Specification and plans submitted (25 Aug). Outstanding client questions resolved. **Foundation:** schema, migrations, seed data, CI/CD and staging working together, shown by one mine site from the database appearing on the map |
| Study break | 1–7 Sep | No timetabled classes. A lighter load is assumed: documentation, testing and carry-over tasks only, with no critical-path work scheduled ahead of the in-class test on 8 September |
| Sprint 2 | Weeks 7–8 · 8–21 Sep | **Map, register and analytics:** the map completed; a user searches, filters and sorts the register, exports the dataset, and reads the headline statistics |
| Sprint 3 | Weeks 9–10 · 22 Sep – 5 Oct | **Contribution and verification:** a contributor submits a record with evidence, and an administrator verifies, rejects or requests further evidence; deployed to the UWA environment. Software Features due 29 September, demonstration video 6 October |
| Sprint 4 | Weeks 11–12 · 6–13 Oct | **Handover:** acceptance walkthrough with the client, defect resolution, handover documentation; final report and showcase on 13 October |

Delivery began a week later than planned and this deliverable was extended to
25 August, so Sprint 1 runs in parallel with the report. After the foundation,
each sprint delivers a vertical slice, a capability complete from database to
interface, rather than a horizontal layer, so every increment is usable and
therefore demonstrable [10]. The client is shown the increment at the end of
Sprints 1, 2 and 3; the facilitator reviews progress fortnightly. Deployment
to the UWA environment falls in Sprint 3 rather than last, so that the
demonstration video on 6 October and the final report are both prepared
against the delivered system.

[`docs/project_plan.md`](https://github.com/zinken7/capstone-group-5/blob/main/docs/project_plan.md)
holds the full breakdown, including the Gantt chart and sprint task lists, and
the [milestones](https://github.com/zinken7/capstone-group-5/milestones) page
shows current progress.

## Next Deliverable: Sprint 1 Assignments

Assignments for later sprints are held in the project plan and confirmed at
each sprint review, scoped so that every member owns work that is individually
demonstrable by the Software Features deliverable on 29 September.

| Member | Initial issue | Completion criterion |
|---|---|---|
| M1 | CI/CD and staging pipeline | Pull requests execute linting, tests and build; `main` deploys to staging automatically |
| M2 | Resolve outstanding client questions (automation bands, UWA environment) | Responses recorded in the requirements specification and any consequent scope change documented |
| M3 | Site and deployment read APIs | Endpoints return filterable records and the API contract is documented in the repository |
| M4 | Schema, migrations and seed data | Migrations execute without error against staging; enumerations and constraints correspond to `ERD.md`; a documented dataset loads by a single command |
| M5 | Map markers drawn from the live API | Markers render with status colour and the supplier filter operates against stored data |
| M6 | Manual test checklist and Sprint 1 smoke test | Checklist committed; the slice verified on staging by a member other than its author |

## Deployment Plan

The environments below are proposed and to be confirmed once the UWA
environment is known.

| Environment | Purpose | Platform | Deployed by |
|---|---|---|---|
| Local | Development | Docker Compose, comprising the application, PostgreSQL with PostGIS and seed data | Any member |
| Staging | Integration and client demonstration | Hosted platform as proposed in section 4, redeployed from `main` | Continuous integration pipeline |
| Production | Handover | UWA-provided environment | M1, subject to manual approval |

The application is containerised so that an identical image runs in all three
environments, configured entirely through environment variables. Each
deployment packages the application, updates the database structure, and
starts the new version. If a release proves faulty, the previous version is
redeployed.

### Contingencies

The UWA hosting environment is not yet confirmed with the client. Shell
access, whether Docker is permitted, whether PostGIS may be installed,
outbound internet access and public reachability all remain open. Delivery
proceeds while the question is unresolved, with a contingency for each
outcome that would affect it materially.

- **Docker not permitted.** On a virtual machine, the application is installed
  from system packages behind nginx and run under systemd. If no suitable
  environment is available, it stays on the hosted platform and is handed over
  with the container image and deployment instructions.
- **Environment provisioned late.** Every increment is demonstrated on
  staging, so no milestone before Sprint 3 depends on the UWA environment. If
  it is not ready by then, deployment moves to Sprint 4; if it is still
  unavailable, the system is handed over for UWA to deploy later.

The remaining two unknowns are not material. Without PostGIS, coordinates are
held as latitude and longitude columns, which serve the point rendering and
bounding-box queries the MVP map requires. Without outbound access from the
server, optional sign-in and the automated evidence check are lost, both
*Could* items; evidence URLs are then validated for format only and opened by
the reviewing administrator rather than fetched by the server, and coordinates
for new mine sites are recorded during administrative review rather than
geocoded.