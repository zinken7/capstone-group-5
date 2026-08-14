# Team Roles and Responsibilities

All team members have equal standing within the project. Each member is responsible for a defined area of work, while major scope, architecture, technology, and design decisions will be discussed and agreed upon by the team.

The assignment of a responsible member does not indicate a higher position within the group. It identifies the member accountable for ensuring that the relevant work is completed, tested, documented, and ready for integration.

## Team Responsibility Summary

| Member | Role                                               | Primary Area                                                                                                  |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Tyrone Tran (24814799)** | **DevOps & AI Integration**                        | Repository management, deployment, system integration, LLM verification, RAG, and technical support           |
| **Hans Lionar (24661999)** | **Project Coordinator and Business Analyst**       | Requirements, planning, client communication, accountability reporting, risks, and quality assurance          |
| **Zerun Zhang (24389925)** | **Backend Development and API Testing**            | Backend services, application logic, APIs, verification workflow, and automated API testing                   |
| **Zunhao Zhang (24758673)** | **Database Development and Data Integration**      | Database design, PostGIS, migrations, data ingestion, data quality, evidence metadata, and imports            |
| **Shee Wang (24368932)** | **Frontend, GIS and Analytics Development**        | User interface, GIS map, dashboard, moderation interface, and report presentation                             |
| **Hengan Weng (24201874)** | **Frontend, Quality Assurance and RAG Evaluation** | Frontend support, system testing, accessibility, RAG evaluation, documentation, and demonstration preparation |

---

## M1 — DevOps & AI Integration

### Main responsibilities

#### GitHub repository management

M1 is responsible for administering and maintaining the GitHub repository and development workflow. This includes:

* Creating and maintaining the repository structure.
* Managing branches, branch protection rules, and merge requirements.
* Creating issue and pull request templates.
* Configuring labels, milestones, and releases.
* Maintaining contribution guidelines and coding conventions.
* Configuring automated checks and continuous integration workflows.
* Resolving repository-level merge and integration issues.
* Ensuring completed work is connected to GitHub issues and reviewed through pull requests.
* Maintaining the GitHub Project board configuration and workflow columns.

M2 will maintain the project-management content within GitHub, including user stories, task descriptions, owners, priorities, deadlines, and acceptance criteria.

#### DevOps and deployment

* Maintain Docker and Docker Compose configurations.
* Manage development, testing, and deployment environments.
* Configure environment variables and secrets.
* Develop continuous integration and deployment workflows.
* Configure automated linting, testing, and application builds.
* Maintain application logging and basic monitoring.
* Develop database backup and recovery procedures with support from M4.
* Maintain deployment and environment setup documentation.
* Ensure the system can be deployed within a UWA-compatible environment.

#### Technical integration

* Coordinate technical integration between the frontend, backend, database, and AI components.
* Define and maintain integration contracts between system components.
* Support the definition of API contracts with M3 and M5.
* Review changes that affect multiple system components.
* Resolve major technical blockers.
* Assist other members with difficult coding or integration problems.
* Prepare integrated application releases for internal and client demonstrations.

#### LLM verification and RAG

M1 is responsible for the technical implementation of the LLM-assisted verification and Retrieval-Augmented Generation system.

Responsibilities include:

* Designing the AI verification architecture.
* Extracting factual claims from submitted records.
* Generating search queries from submitted information.
* Integrating approved web-search services.
* Processing submitted evidence URLs and documents.
* Extracting and cleaning document content.
* Splitting evidence into searchable chunks.
* Generating embeddings.
* Implementing vector retrieval.
* Retrieving relevant evidence for each claim.
* Producing structured LLM verification outputs.
* Mapping AI conclusions to source citations.
* Implementing insufficient-evidence and refusal behaviour.
* Generating evidence-backed verification recommendations.
* Supporting evidence-grounded market report generation.
* Storing prompts, retrieved evidence, responses, and citations for auditing.
* Ensuring the LLM does not independently approve records.

### Expected deliverables

* GitHub repository configuration.
* Contribution and branching guidelines.
* Issue and pull request templates.
* Continuous integration workflow.
* Docker deployment configuration.
* Deployment and environment guide.
* System architecture documentation.
* Integrated application releases.
* AI verification prototype.
* RAG retrieval pipeline.
* Citation-generation system.
* Evidence-backed verification report generation.
* Technical integration tests.

---

## M2 — Project Coordinator and Business Analyst

### Main responsibilities

#### Requirements and business analysis

* Convert client discussions into clear user requirements.
* Define functional and non-functional requirements.
* Write user stories and acceptance criteria.
* Maintain the agreed MVP scope.
* Document features that are outside the MVP.
* Identify primary users and stakeholder needs.
* Maintain a requirements traceability matrix.
* Document changes to requirements and scope.
* Confirm major requirements and decisions with the client.
* Translate feedback from the client and RCT into actionable tasks.

#### Project coordination

* Create and maintain the project backlog.
* Break project deliverables into manageable tasks.
* Record task owners, supporting members, reviewers, and deadlines.
* Monitor task progress and identify delayed work.
* Track dependencies and blockers.
* Organise weekly team meetings.
* Prepare weekly agendas and progress summaries.
* Record team decisions and action items.
* Ensure members update their GitHub issues.
* Coordinate preparation for client meetings and demonstrations.
* Escalate scope, workload, or scheduling problems to the team.

#### Weekly accountability table

M2 is responsible for preparing and maintaining the accountability table submitted to the teaching team each week.

The accountability table should record:

* Team member name.
* Assigned tasks for the week.
* Expected deliverables.
* Work completed.
* Evidence of contribution.
* GitHub issue or pull request links.
* Meeting, research, testing, or documentation contributions.
* Outstanding tasks.
* Blockers or dependencies.
* Planned tasks for the following week.
* Any changes in workload or responsibilities.

M2 must:

* Collect contribution updates from all team members.
* Confirm that reported work matches available evidence.
* Ensure the table represents both technical and non-technical contributions.
* Identify overdue or uncompleted tasks honestly.
* Circulate the table to the team for review before submission.
* Submit the completed accountability table by the required deadline.
* Retain previous versions as evidence of project progress.

Each team member is responsible for providing accurate contribution information and supporting evidence to M2.

#### Client communication

* Prepare meeting agendas.
* Record meeting minutes.
* Document client decisions and requested changes.
* Record action items, owners, and deadlines.
* Send follow-up summaries for written confirmation.
* Maintain evidence of client communication.
* Coordinate feedback requests through email or Microsoft Teams.
* Track client approval of the MVP and other deliverables.
* Prepare questions for stakeholder requirements elicitation.

#### AI verification requirements

M2 defines what the AI verification system is required to evaluate.

Responsibilities include:

* Defining verification categories.
* Defining claim-level assessment criteria.
* Defining accepted evidence types.
* Defining source-quality categories.
* Specifying when a claim is:

  * supported;
  * partially supported;
  * contradicted;
  * insufficiently supported;
  * not applicable.
* Defining when human review is mandatory.
* Ensuring the AI cannot automatically mark a record as verified.
* Defining citation and traceability requirements.
* Defining the structure of the AI verification report.
* Preparing expected results for AI evaluation.
* Reviewing whether AI outputs satisfy business requirements.

#### Reports and analytics requirements

* Define the required structure of verification reports.
* Define the required structure of market and analytics reports.
* Identify the business questions reports must answer.
* Define required charts, statistics, filters, and evidence citations.
* Define report disclaimers and data limitations.
* Specify export requirements.
* Define report acceptance criteria.

#### Project documentation and quality assurance

* Prepare the project specification.
* Prepare the project plan and Gantt chart.
* Maintain the risk register.
* Document cybersecurity risks and mitigations.
* Prepare the team skills assessment.
* Document identified skills gaps and training actions.
* Prepare technology comparisons and justifications.
* Develop the system test plan with M6.
* Develop the user acceptance testing plan.
* Coordinate UAT and record outcomes.
* Maintain the project handover checklist.

### Expected deliverables

* Client-approved problem statement.
* Client-approved MVP.
* User requirements.
* User stories.
* Acceptance criteria.
* Project backlog.
* Weekly accountability tables.
* Meeting agendas and minutes.
* Project specification.
* Project plan.
* Gantt chart.
* Risk register.
* Skills assessment.
* Technology evaluation.
* Requirements traceability matrix.
* AI verification policy.
* Source-quality criteria.
* Verification report specification.
* Market report specification.
* UAT plan and UAT results.
* Client communication evidence.

---

## M3 — Backend Development and API Testing

### Main responsibilities

#### Backend application development

* Develop the backend application services and business logic.
* Implement backend routes and service layers.
* Implement equipment and deployment record management.
* Implement company, manufacturer, mine-site, and technology-provider services.
* Implement evidence and case-study management.
* Implement public submission functionality.
* Implement administrator moderation functionality.
* Implement verified and unverified record handling.
* Implement trusted contributor logic if included in scope.
* Implement validation rules at the application level.
* Implement error handling and consistent API responses.
* Implement pagination, sorting, and filtering.
* Implement duplicate checking with support from M4.
* Implement audit-related application logic.

#### API development

Develop APIs for:

* Equipment records.
* Equipment models.
* Deployments.
* Manufacturers.
* Mining companies.
* Mine sites.
* Regions and operations.
* Technology providers.
* Evidence sources.
* Case studies.
* Public submissions.
* Verification status.
* AI verification reports.
* Administrator decisions.
* GIS and GeoJSON data.
* Analytics and dashboard data.
* Market report data.
* Search and filtering.

#### Submission and verification workflow

Implement the application workflow:

```text
Submitted
→ Visible as Unverified
→ AI Review Running
→ AI Assessed
→ Pending Human Review
→ Verified / Rejected / More Evidence Required
```

Responsibilities include:

* Receiving public submissions.
* Validating required information.
* Sending submission details to the AI verification service.
* Receiving structured AI verification results.
* Saving verification reports through the database layer.
* Making unverified submissions available under the correct filter.
* Supporting administrator review.
* Supporting approve, reject, and request-more-evidence actions.
* Updating public verification status after administrator decisions.
* Preventing AI output from independently approving a submission.

#### API testing

M3 is responsible for automated API testing.

Testing responsibilities include:

* Unit tests for backend services.
* API endpoint tests.
* Authentication and administration tests where applicable.
* Validation tests.
* Search and filtering tests.
* Pagination and sorting tests.
* Submission workflow tests.
* Verification status transition tests.
* GIS endpoint tests.
* Analytics endpoint tests.
* Error response tests.
* Integration tests between backend services and the database.
* Integration tests between backend services and the AI verification component.

M3 will review API test scenarios with M2 and coordinate database-related test setup with M4.

#### API documentation

* Maintain OpenAPI and Swagger documentation.
* Provide endpoint descriptions.
* Document request and response schemas.
* Include example requests and responses.
* Document errors and status codes.
* Document authentication requirements.
* Maintain API integration notes for M5 and M1.

### Expected deliverables

* Backend application services.
* REST APIs.
* Search and filtering APIs.
* GIS and GeoJSON APIs.
* Analytics APIs.
* Submission APIs.
* Moderation APIs.
* AI verification integration endpoints.
* Verification workflow.
* Consistent error handling.
* OpenAPI documentation.
* Automated API test suite.
* Backend integration test results.
* API performance improvements.

---

## M4 — Database Development and Data Integration

### Main responsibilities

#### Database design

M4 is responsible for designing and maintaining the PostgreSQL/PostGIS database.

Responsibilities include:

* Designing the entity-relationship model.
* Defining tables and relationships.
* Defining primary and foreign keys.
* Defining database constraints.
* Defining indexes and query optimisation strategies.
* Defining spatial data types and PostGIS indexes.
* Maintaining migration files.
* Maintaining audit fields.
* Supporting historical and verification-status data.
* Supporting structured storage of AI verification results.

The database should support entities including:

* Companies.
* Manufacturers.
* Equipment models.
* Equipment types.
* Equipment deployments.
* Mine sites.
* Operations.
* Regions.
* Countries.
* Technology providers.
* Evidence sources.
* Case studies and media.
* Public submissions.
* Contributors.
* Verification claims.
* Verification reports.
* AI-retrieved evidence.
* Administrator decisions.
* Report-generation records.
* Audit information.

#### Data integration

* Develop seed-data processes.
* Develop CSV import functionality.
* Prepare standard spreadsheet templates.
* Support semi-manual batch imports.
* Validate imported data.
* Map external data fields to the internal schema.
* Handle missing, invalid, or inconsistent fields.
* Normalise imported manufacturer, company, location, and equipment names.
* Support data ingestion from client-provided spreadsheets.
* Support evidence and source metadata ingestion.
* Coordinate evidence-document storage requirements with M1.
* Coordinate API data requirements with M3.

#### Data quality

* Define standard naming conventions.
* Standardise manufacturer names.
* Standardise equipment categories.
* Standardise country and region names.
* Standardise mine-site and company naming.
* Validate dates and coordinates.
* Identify duplicate or near-duplicate records.
* Maintain data provenance.
* Maintain source metadata.
* Distinguish synthetic, unverified, and verified data.
* Check relationships between equipment, mine sites, companies, and evidence.
* Maintain a data-quality checklist.

#### Evidence metadata

For each evidence source, store where available:

* Title.
* Publisher.
* Author.
* Publication date.
* URL.
* Access date.
* Source type.
* Source-quality category.
* Related company.
* Related mine site.
* Related equipment.
* Related deployment.
* Verification status.
* Extracted content reference.
* Document-processing status.

#### Database testing and performance

* Test database constraints.
* Test migrations.
* Test spatial queries.
* Test indexes.
* Test duplicate-prevention logic.
* Test data imports.
* Test rollback and recovery processes.
* Analyse slow queries.
* Optimise database indexes and aggregations.
* Support database backup and restoration with M1.

#### Documentation

* Maintain the entity-relationship diagram.
* Maintain the data dictionary.
* Document data relationships.
* Document import formats.
* Document data-cleaning rules.
* Document data-quality requirements.
* Document database backup and recovery requirements.

### Expected deliverables

* Entity-relationship diagram.
* PostgreSQL/PostGIS schema.
* Migration files.
* Database constraints and indexes.
* Spatial-query support.
* Seed-data process.
* Initial demonstration dataset.
* CSV import template.
* Data-import utilities.
* Data-normalisation rules.
* Evidence metadata structure.
* Data dictionary.
* Data-quality checklist.
* Database test results.
* Backup and recovery support documentation.

---

## M5 — Frontend, GIS and Analytics Development

### Main responsibilities

#### Public interface

* Develop the application landing page.
* Develop the public equipment registry.
* Develop search and filtering controls.
* Develop record-detail pages.
* Display verified and unverified labels.
* Display evidence sources and citations.
* Display case studies and media.
* Develop loading, empty, and error states.
* Ensure the interface is responsive.

#### GIS functionality

* Develop the interactive GIS map.
* Display mine-site and deployment markers.
* Implement marker clustering.
* Implement map popups.
* Integrate GeoJSON data from the backend.
* Implement geographic filters.
* Support filtering by:

  * country;
  * region;
  * mine site;
  * manufacturer;
  * equipment type;
  * automation level;
  * technology provider;
  * verification status.
* Support navigation between map markers and detailed records.

#### Analytics dashboard

Develop visualisations for:

* Deployments by year.
* Equipment quantity by country.
* Equipment by manufacturer.
* Equipment by type.
* Technology providers.
* Automation levels.
* Verification status.
* Geographic distribution.
* Mine-site distribution.
* Adoption trends.

#### Submission and administration interface

* Develop the public submission form.
* Develop evidence URL fields.
* Display submission-validation messages.
* Display submission confirmation and status.
* Develop the administrator moderation interface.
* Display claim-level AI verification results.
* Display supported, contradicted, and insufficient-evidence claims.
* Display source-quality information.
* Display citation links.
* Implement approve, reject, and request-more-evidence controls.

#### Report interface

* Develop the verification report interface.
* Develop the market-analysis report interface.
* Develop report filters.
* Develop report previews.
* Display database statistics.
* Display RAG-generated explanations.
* Display source citations.
* Develop export controls where included in scope.

### Expected deliverables

* Responsive public interface.
* Equipment registry.
* Record-detail interface.
* GIS map.
* Analytics dashboard.
* Submission form.
* Administration interface.
* AI verification report interface.
* Market-report interface.
* Citation display.
* Loading and error states.
* Frontend integration with backend APIs.
* Frontend automated tests where practical.

---

## M6 — Frontend, Quality Assurance and RAG Evaluation

### Main responsibilities

#### Frontend support

* Assist with reusable frontend components.
* Develop form controls.
* Develop validation messages.
* Develop loading indicators.
* Develop empty and error states.
* Support responsive layout fixes.
* Support browser compatibility.
* Support accessibility improvements.
* Assist with minor frontend bug fixes.
* Support preparation of the report and verification interfaces.

#### System quality assurance

* Maintain the manual system test checklist.
* Test public registry functionality.
* Test search and filtering.
* Test GIS functionality.
* Test dashboard functionality.
* Test submission forms.
* Test administration workflows.
* Test verification reports.
* Test market reports.
* Test citation links.
* Test responsive behaviour.
* Test supported browsers.
* Record reproducible bug reports.
* Verify resolved defects.
* Support regression testing before releases.

#### Accessibility and usability

* Check keyboard navigation.
* Check form labels.
* Check colour contrast.
* Check validation feedback.
* Check readable error messages.
* Check responsive layouts.
* Check basic screen-reader compatibility where practical.
* Record usability issues from internal and client demonstrations.

#### RAG evaluation

M6 is responsible for systematically evaluating the outputs of the AI verification and RAG components.

Responsibilities include:

* Preparing sample submissions.
* Preparing evidence documents.
* Preparing supported claims.
* Preparing contradictory claims.
* Preparing insufficient-evidence examples.
* Defining expected claim-level outcomes with M2.
* Testing whether the correct evidence is retrieved.
* Testing whether citations link to the correct sources.
* Identifying hallucinated claims.
* Identifying unsupported conclusions.
* Identifying missing or irrelevant citations.
* Identifying inconsistent recommendations.
* Testing refusal behaviour.
* Comparing AI results across repeated runs.
* Recording failures as GitHub issues.
* Confirming fixes with regression tests.

#### Report testing

* Confirm report totals match database results.
* Confirm filters are applied correctly.
* Confirm verified and unverified data are distinguished.
* Confirm factual explanations include evidence.
* Confirm citations open the correct source.
* Confirm report limitations are displayed.
* Test HTML or PDF exports if implemented.

#### Documentation and demonstration

* Prepare the user guide.
* Prepare the administrator guide.
* Prepare test evidence and screenshots.
* Prepare the demonstration script.
* Prepare example submissions.
* Prepare example verification reports.
* Support final presentation preparation.

### Expected deliverables

* Frontend support components.
* Manual test plan.
* System test results.
* Browser compatibility report.
* Accessibility checklist.
* RAG evaluation dataset.
* RAG test-results report.
* Hallucination and citation defect reports.
* Report-accuracy testing.
* User guide.
* Administrator guide.
* Demonstration script.

---

# Shared Responsibilities

All team members are expected to:

* Participate in requirements discussions.
* Participate in major design decisions.
* Attend relevant client and stakeholder meetings.
* Maintain assigned GitHub issues.
* Use feature branches.
* Submit changes through pull requests.
* Review another member’s work when assigned.
* Add or update tests for implemented work.
* Document major decisions.
* Report blockers early.
* Provide weekly accountability information to M2.
* Provide evidence of completed work.
* Participate in integration testing.
* Participate in sprint demonstrations.
* Contribute to the final presentation and handover.

---

# Team Workflow

The team will use GitHub as the central platform for source control, task tracking, code review, testing evidence, and release management.

All significant work items must be recorded as GitHub issues with a responsible member, expected deliverable, acceptance criteria, deadline, dependencies, and reviewer. Technical changes must be completed on feature branches and submitted through pull requests before being merged.

Each member is responsible for keeping their assigned issues updated and providing accurate evidence of completed work. M1 will maintain the repository configuration and development workflow, while M2 will coordinate task allocation, progress tracking, deadlines, and weekly accountability reporting.

Major scope, architecture, and design decisions will be discussed by the team and documented in the repository.


---

# AI Verification and RAG Responsibilities

| Work Item                          | Responsible Member | Supporting Members |
| ---------------------------------- | ------------------ | ------------------ |
| AI and RAG architecture            | M1                 | M3 and M4          |
| Web-search integration             | M1                 | M4                 |
| Evidence ingestion and processing  | M1                 | M4                 |
| Claim extraction                   | M1                 | M2                 |
| Embeddings and vector retrieval    | M1                 | M4                 |
| Structured LLM output              | M1                 | M2                 |
| Verification criteria              | M2                 | M1                 |
| Source-quality policy              | M2                 | M4                 |
| Evidence metadata storage          | M4                 | M1                 |
| Verification claim and report APIs | M3                 | M1                 |
| Human moderation workflow          | M3                 | M5                 |
| Verification report interface      | M5                 | M1                 |
| Citation interface                 | M5                 | M1                 |
| Evaluation dataset                 | M6                 | M2 and M4          |
| Hallucination testing              | M6                 | M1                 |
| Citation testing                   | M6                 | M1 and M5          |
| Final AI integration               | M1                 | M3, M4 and M5      |

---

# Report-Generation Responsibilities

## Verification Report

| Work Item                                          | Responsible Member |
| -------------------------------------------------- | ------------------ |
| Define report sections and decision criteria       | M2                 |
| Store submissions, claims, evidence, and decisions | M4                 |
| Provide report and moderation APIs                 | M3                 |
| Generate claim-level AI assessments                | M1                 |
| Generate evidence-backed recommendations           | M1                 |
| Display the report and citations                   | M5                 |
| Prepare sample data and sources                    | M4                 |
| Test factual support and citation accuracy         | M6                 |

## Market and Analytics Report

| Work Item                                      | Responsible Member |
| ---------------------------------------------- | ------------------ |
| Define report use cases and content            | M2                 |
| Maintain the structured report data            | M4                 |
| Provide aggregation and report APIs            | M3                 |
| Retrieve supporting evidence through RAG       | M1                 |
| Generate evidence-grounded narratives          | M1                 |
| Develop charts, filters, previews, and exports | M5                 |
| Verify statistics and citations                | M6                 |

---

# Weekly Accountability Process

The weekly accountability process will operate as follows:

1. Each member updates their GitHub issues before the weekly team meeting.
2. Each member provides M2 with:

   * completed work;
   * work in progress;
   * evidence links;
   * blockers;
   * next-week tasks.
3. M2 prepares the accountability table.
4. The team reviews the table for accuracy.
5. Missing or unclear evidence is corrected before submission.
6. M2 submits the final table to the teaching team.

Acceptable contribution evidence may include:

* GitHub commits.
* Pull requests.
* Issue updates.
* Code reviews.
* Test results.
* Meeting minutes.
* Requirement documents.
* Research notes.
* Architecture diagrams.
* Data-cleaning records.
* Risk-register updates.
* Client communication.
* Demonstration materials.
* Documentation changes.

---

# Work Allocation Principle

Each significant work item must include:

* One responsible member.
* Supporting members where required.
* A clearly defined deliverable.
* Acceptance criteria.
* A deadline.
* A reviewer who is not the primary implementer.
* Evidence of completion recorded in GitHub.

This structure ensures that responsibilities remain clear while all members retain equal status within the team.
