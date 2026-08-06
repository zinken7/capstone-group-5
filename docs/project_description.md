# Autonomous Mining Equipment Intelligence Portal

## Project Summary, Scope, MVP and Development Plan

## 1. Summary

The project will develop a web-based, crowdsourced and queryable global repository of autonomous and remotely operated mining equipment.

The system will centralise information that is currently fragmented across mining-company announcements, equipment-manufacturer websites, technology-provider publications, industry news, academic papers, case studies and contributor submissions. The client confirmed that an existing open dataset covering this information could not be identified and that the purpose of the project is to begin creating such a dataset.

The portal will allow users to:

* Search and filter autonomous mining equipment and deployment records.
* Explore the geographic distribution of equipment through an interactive GIS map.
* Analyse adoption trends through dashboards and market reports.
* Submit new equipment or deployment information through a crowdsourcing form.
* Distinguish clearly between verified and unverified information.
* View the evidence supporting each verified record.
* Use an LLM-assisted verification system to assess whether submitted information is supported by publicly available sources.
* Generate claim-level verification reports containing supporting, conflicting or missing evidence.
* Use the centralised database and approved evidence repository to support evidence-grounded market and analytics reports.

The centralised database will provide the structured facts used for filtering, calculations, GIS analysis and statistical reporting. The Retrieval-Augmented Generation component will retrieve supporting evidence and contextual information from approved sources. The LLM will use the retrieved information to produce structured verification assessments and evidence-grounded narrative reports.

The LLM will not be treated as an independent authority and will not automatically mark a submission as verified. Final verification decisions will remain with an authorised human reviewer.

---

## 2. Project Context

Mining companies, equipment manufacturers and automation-technology providers publish information about autonomous mining deployments through many separate channels. There is currently no single publicly accessible and verifiable repository that records this information consistently.

The client described the broader purpose of the portal as understanding:

* How many mining machines are operating in the market.
* How many machines use autonomous, tele-remote or related technology.
* The level of automation associated with each deployment.
* The leading equipment manufacturers and technology suppliers.
* The geographic distribution of deployments.
* Potential market opportunities and adoption trends.

Without a centralised system, users must manually search through separate company websites, press releases, industry publications and reports. This makes it difficult to:

* Compare deployments across companies, regions and equipment types.
* Determine whether submitted information is supported by evidence.
* Track changes in automation adoption over time.
* Identify leading suppliers and technology providers.
* Produce repeatable and traceable market-analysis reports.
* Identify incomplete, duplicated or contradictory information.

The project therefore addresses both a software problem and a data-quality problem. It must provide a usable portal while also establishing a controlled process for collecting, assessing, publishing and maintaining evidence-backed information.

---

## 3. Stakeholders and Intended Users

### 3.1 Client

The client is responsible for defining the project objectives, reviewing the proposed scope and providing feedback on the prototype, requirements and deliverables.

### 3.2 Industry users

Mining companies, equipment manufacturers, automation providers, consultants and market analysts may use the portal to understand the deployment and adoption of autonomous mining technologies.

The client identified RCT Global as a representative real-world user. RCT develops mining automation and control systems and is expected to provide feedback about the data and analysis that an industry user would need from the portal.

### 3.3 Researchers and students

Researchers and students may use the portal to study:

* Automation adoption.
* Geographic distribution.
* Technology suppliers.
* Equipment categories.
* Deployment timelines.
* Supporting case studies.

### 3.4 Contributors

Industry professionals, researchers and members of the public may submit new information together with evidence links.

### 3.5 Administrators and reviewers

Authorised reviewers will assess submissions, inspect AI-generated verification reports, review supporting sources and make the final decision to approve, reject or request more evidence.

---

## 4. Problem Statement

There is no centralised, publicly accessible and evidence-backed dataset that allows users to search, compare, map and analyse autonomous mining equipment deployments globally.

Relevant information is distributed across many sources and is expressed using inconsistent terminology, data structures and levels of detail. Publicly submitted information may also be incomplete, duplicated, outdated or unsupported.

The project will address this problem by developing a full-stack web application that combines:

* A structured geospatial database.
* A crowdsourced data-submission workflow.
* Evidence and source management.
* Human moderation.
* LLM-assisted evidence assessment.
* Retrieval-Augmented Generation.
* GIS visualisation.
* Analytics and evidence-backed report generation.

---

## 5. Project Objectives

The project has the following objectives:

1. Create a centralised and queryable repository of autonomous mining equipment and deployment data.

2. Support structured geographic grouping, including country, region, operation and mine site.

3. Allow contributors to submit new information together with supporting evidence.

4. Make new submissions available promptly while clearly identifying them as unverified.

5. Allow users to view verified data by default and deliberately select unverified data where required.

6. Develop a human-controlled verification workflow.

7. Use an LLM to assess whether individual claims in a submission are supported, contradicted or not sufficiently supported by available evidence.

8. Display traceable sources for AI-generated assessments.

9. Provide an interactive GIS map showing the geographic distribution of equipment and deployments.

10. Provide analytics dashboards for equipment, manufacturers, suppliers, locations, automation levels and deployment timelines.

11. Generate verification reports for submitted records.

12. Generate market and analytics reports using structured database results and evidence retrieved through RAG.

13. Deliver a system that can be deployed in a UWA-compatible environment using documented and reproducible deployment processes.

---

## 6. Proposed System

The proposed system will contain the following major components.

### 6.1 Centralised database

PostgreSQL and PostGIS will store structured information including:

* Equipment type.
* Manufacturer.
* Model.
* Quantity.
* Equipment specifications.
* Deployment date.
* Commissioning date.
* Automation level.
* Technology provider or integrator.
* Equipment owner.
* Mine operator.
* Mine site.
* Operation.
* Region.
* Country.
* Geographic coordinates.
* Verification status.
* Evidence sources.
* Case studies and media.
* Submission history.
* Verification claims.
* AI verification reports.
* Human-review decisions.

The database will be the authoritative source for structured calculations, filters, geographic queries and dashboard statistics.

### 6.2 Crowdsourcing interface

A public submission form will allow users to propose:

* A new equipment deployment.
* A correction to an existing record.
* An additional evidence source.
* A case study or media link.

Each submission must contain sufficient identifying information and at least one evidence source where required by the agreed verification policy.

### 6.3 Verification workflow

The proposed workflow is:

```text
Submitted
→ Published as Unverified
→ AI Review Running
→ AI Assessed
→ Pending Human Review
→ Verified / Rejected / More Evidence Required
```

The client stated that submissions should appear promptly after submission, while verified records should be shown by default. Users should still be able to select and view unverified submissions.

### 6.4 LLM-assisted verification

The system will divide a submission into individual factual claims, such as:

* The manufacturer exists.
* The equipment model exists.
* The mine site exists.
* The technology provider offers the stated technology.
* The equipment was deployed at the stated site.
* The deployment occurred on the stated date.
* The deployment included the stated number of machines.

The system will then:

1. Generate search queries for each claim.
2. Search submitted evidence and approved external sources.
3. Extract relevant passages.
4. Retrieve the most relevant evidence.
5. Ask the LLM to assess each claim.
6. Produce a structured recommendation report.
7. Include citations for every supported or contradicted claim.
8. Send the report to a human reviewer.

The client demonstrated a comparable process in which an AI bot checks several categories, searches for supporting information and produces an overall recommendation report.

The client also described a report that identifies which criteria could be verified, which could not be verified and why.

### 6.5 Retrieval-Augmented Generation

RAG will be used to retrieve evidence from:

* Submitted URLs.
* Approved company announcements.
* Manufacturer documentation.
* Technology-provider websites.
* Government publications.
* Academic papers.
* Industry publications.
* Case studies stored in the repository.

RAG will limit the information supplied to the LLM to relevant retrieved evidence. It will also allow the system to connect generated claims and reports to traceable source documents.

RAG does not guarantee that a source is correct. It provides evidence traceability and reduces unsupported generation. Human review remains necessary.

### 6.6 GIS map

The system will provide an interactive map that supports:

* Mine-site markers.
* Deployment markers or grouped site records.
* Marker clustering.
* Geographic filtering.
* Site and equipment details.
* Navigation between map records and database records.
* Verified and unverified status filtering.

### 6.7 Analytics dashboard

The dashboard will provide visualisations for:

* Deployments by year.
* Equipment quantities by country.
* Equipment quantities by manufacturer.
* Equipment by type.
* Technology providers.
* Automation levels.
* Verified and unverified records.
* Geographic distribution.
* Mine-site distribution.
* Adoption trends.

### 6.8 Report generation

The system will support two report categories.

#### Verification reports

Verification reports will be generated for individual submissions and will contain:

* Submitted information.
* Extracted claims.
* Evidence found for each claim.
* Source details.
* Supported claims.
* Partially supported claims.
* Contradicted claims.
* Claims with insufficient evidence.
* AI-generated reasoning summary.
* Overall AI recommendation.
* Human-review decision.
* Review date and audit information.

#### Market and analytics reports

Market reports may be generated for selected:

* Countries.
* Regions.
* Mine sites.
* Equipment types.
* Manufacturers.
* Technology providers.
* Time periods.
* Verification statuses.

Database queries will provide the quantitative results. RAG will retrieve relevant case studies and evidence. The LLM may then produce an evidence-grounded narrative explaining the results.

All report statistics must originate from database queries. All external factual explanations must include citations.

---

## 7. Minimum Viable Product (MVP)

The MVP will demonstrate a complete end-to-end workflow rather than attempting to catalogue every autonomous mining machine globally during the project period.

### 7.1 Core MVP capabilities

The proposed MVP will include:

1. A structured PostgreSQL/PostGIS database.

2. Equipment, deployment, company, technology-provider, location and evidence records.

3. A public searchable equipment registry.

4. Filtering by selected attributes, including:

   * equipment type;
   * manufacturer;
   * country;
   * mine site;
   * technology provider;
   * deployment year;
   * verification status.

5. An interactive GIS map.

6. An analytics dashboard.

7. A public crowdsourcing form.

8. Evidence URL submission.

9. Immediate publication of new records under an `Unverified` status.

10. Verified records displayed by default.

11. An administration and moderation interface.

12. Human approval, rejection and request-more-evidence actions.

13. A structured verification-status workflow.

14. An initial LLM-assisted verification process.

15. Claim-level verification results.

16. Source citations for AI-supported conclusions.

17. A verification recommendation report.

18. Storage of the AI report and human decision.

19. An initial demonstration dataset.

20. Docker-based deployment and setup documentation.

### 7.2 MVP approval status

The core database, crowdsourcing, map, analytics and verification direction are supported by the project brief and client discussion.

The transcript describes the AI verification bot as a desirable stretch feature during the initial discussion. The team’s current interpretation is that an initial LLM-assisted verification mechanism should be included in the planned MVP because the client requested a mechanism that checks whether submitted information is reasonable and displays supporting sources.

This interpretation should be sent to the client for written confirmation before the MVP scope is treated as formally approved.

### 7.3 MVP limitations

The MVP will not claim to:

* Contain every autonomous mining machine ever deployed.
* Guarantee the factual truth of every source.
* Replace human verification.
* Automatically approve records.
* Crawl the entire Internet continuously.
* Provide real-time mine telemetry.
* Integrate directly with operational mining systems.
* Train a new foundation model.
* Provide a fully autonomous fact-checking service.
* Support unrestricted public file uploads without security controls.
* Provide production-scale operation without further security and performance assessment.

---

## 8. Development Stages

## Stage 1 — Requirements Confirmation and Stakeholder Analysis

### Activities

* Review the initial project brief.
* Review the existing prototype.
* Confirm the problem statement.
* Confirm target users.
* Confirm required data fields.
* Confirm the meaning of an equipment record.
* Confirm verification rules.
* Confirm MVP and out-of-scope items.
* Present the prototype to RCT.
* Collect industry-user feedback.
* Create user stories and acceptance criteria.
* Obtain written client confirmation.

### Outputs

* Approved problem statement.
* Stakeholder list.
* User requirements.
* User stories.
* Acceptance criteria.
* MVP scope.
* Out-of-scope list.
* Meeting minutes.
* Requirements traceability matrix.

The client requested that the team bring the prototype and specific questions about fields and functionality to the RCT requirements meeting.

---

## Stage 2 — Architecture, Repository and Data Foundation

### Activities

* Finalise the application architecture.
* Configure the GitHub repository.
* Establish branch and pull-request workflows.
* Create Docker development environments.
* Design the database schema.
* Configure PostgreSQL and PostGIS.
* Create migrations.
* Define the evidence metadata model.
* Define the verification-report model.
* Prepare initial seed data.
* Define API contracts.

### Outputs

* Architecture diagram.
* Configured repository.
* Docker Compose environment.
* Entity-relationship diagram.
* Database schema.
* Migration files.
* Data dictionary.
* API specification.
* Initial demonstration data.

---

## Stage 3 — Core Portal Development

### Activities

* Develop backend services and APIs.
* Develop the public equipment registry.
* Implement search and filtering.
* Implement GIS endpoints and map interface.
* Implement analytics endpoints and dashboard.
* Develop record-detail pages.
* Develop public submission functionality.
* Implement evidence-source management.
* Implement verified and unverified states.
* Develop the administrator interface.

### Outputs

* Searchable registry.
* GIS map.
* Analytics dashboard.
* Submission form.
* Evidence display.
* Administration interface.
* Working verification-status workflow.
* Automated API tests.

---

## Stage 4 — LLM Verification and RAG

### Activities

* Define verification categories.
* Define accepted evidence types.
* Extract claims from submissions.
* Generate search queries.
* Integrate a search provider.
* Process submitted evidence.
* Generate embeddings.
* Implement vector retrieval.
* Generate structured LLM assessments.
* Map claims to citations.
* Implement insufficient-evidence behaviour.
* Store AI reports.
* Integrate AI results with the administrator interface.
* Create an evaluation dataset.

### Outputs

* Claim-extraction component.
* Evidence-ingestion pipeline.
* RAG retrieval pipeline.
* Structured AI output.
* Source citations.
* Verification recommendation report.
* Human-review integration.
* RAG evaluation results.

---

## Stage 5 — Reporting and Data Analysis

### Activities

* Implement database aggregation queries.
* Define verification-report templates.
* Define market-report templates.
* Develop report filters.
* Generate charts and summary statistics.
* Retrieve contextual evidence using RAG.
* Generate evidence-grounded narrative summaries.
* Display citations and limitations.
* Implement report export where feasible.

### Outputs

* Verification reports.
* Market and analytics reports.
* Evidence-backed narrative summaries.
* Charts and data tables.
* Report citation display.
* Report accuracy tests.

---

## Stage 6 — Testing, Security and Quality Assurance

### Activities

* Conduct backend and API testing.
* Conduct database and migration testing.
* Conduct frontend and browser testing.
* Conduct accessibility testing.
* Test submission and moderation workflows.
* Evaluate RAG retrieval.
* Test hallucination and citation failures.
* Test report calculations.
* Conduct basic cybersecurity assessment.
* Test deployment and database recovery.
* Run user acceptance testing.

### Outputs

* Automated test results.
* Manual system-test results.
* RAG evaluation report.
* Citation-accuracy report.
* Accessibility checklist.
* Security and risk review.
* User acceptance testing results.
* Defect and resolution records.

---

## Stage 7 — Deployment, Demonstration and Handover

### Activities

* Deploy the integrated system.
* Prepare deployment instructions.
* Prepare administrator and user guides.
* Prepare sample submissions.
* Prepare sample verification reports.
* Demonstrate the completed workflows.
* Collect final client feedback.
* Resolve critical defects.
* Obtain client acceptance.
* Prepare handover materials.

### Outputs

* Deployable application.
* Source-code repository.
* Deployment guide.
* User guide.
* Administrator guide.
* Demonstration script.
* Final project report.
* Client acceptance evidence.
* Handover package.

---

## 9. Expected Project Outcomes

At the end of the project, the team expects to deliver:

1. A functioning full-stack portal for autonomous mining equipment data.

2. A centralised geospatial database.

3. A repeatable data model for equipment, deployments, locations, companies, technology providers and evidence.

4. A crowdsourcing workflow that allows new information to be submitted.

5. Clear separation between verified and unverified data.

6. A human moderation process.

7. An initial LLM-assisted evidence-assessment system.

8. Claim-level verification reports with source citations.

9. A searchable evidence repository.

10. A GIS map showing geographic distribution.

11. An analytics dashboard showing adoption trends.

12. Evidence-grounded report-generation capability.

13. An initial demonstration dataset.

14. Automated and manual testing evidence.

15. A documented Docker-based deployment process.

16. User, administrator and technical documentation.

17. Evidence of client communication, requirements elicitation, feedback and acceptance.

---

## 10. Success Criteria

The project will be considered successful when:

* Users can search and filter equipment and deployment records.
* Users can view deployment locations on the GIS map.
* Users can view meaningful analytics from the central database.
* Contributors can submit records and evidence.
* Submitted records are clearly labelled as unverified.
* Verified records are shown by default.
* Administrators can inspect and moderate submissions.
* The AI system can divide selected submissions into factual claims.
* The AI system can retrieve evidence for those claims.
* Supported AI conclusions contain traceable citations.
* The system reports insufficient evidence instead of presenting an unsupported claim as verified.
* The AI cannot independently mark a record as verified.
* Administrators can approve, reject or request additional evidence.
* Verification decisions are stored for auditing.
* Verification reports can be viewed by authorised reviewers.
* Selected market reports use database statistics and evidence-backed explanations.
* The system can be deployed using the documented process.
* The agreed acceptance criteria are demonstrated to the client or representative users.

---

## 11. Key Risks and Controls

| Risk                              | Planned Control                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| LLM hallucination                 | Restrict generation to retrieved evidence, require citations and retain human approval |
| Incorrect or misleading sources   | Use source-quality categories and allow reviewers to reject weak evidence              |
| Missing evidence                  | Return `Insufficient Evidence` and request additional information                      |
| Duplicate submissions             | Use database matching and manual duplicate review                                      |
| Incomplete global coverage        | Display coverage limitations and avoid claiming that the dataset is complete           |
| Broken evidence links             | Store metadata and conduct link checks where feasible                                  |
| Malicious submissions             | Apply validation, moderation, rate limits and secure input handling                    |
| Sensitive contributor information | Minimise stored personal information and define retention requirements                 |
| Inaccurate map coordinates        | Validate coordinates and allow approximate site locations where necessary              |
| API or LLM service costs          | Limit calls, cache results and define usage thresholds                                 |
| External-service failure          | Preserve manual verification and core database functionality                           |
| Scope expansion                   | Maintain an agreed MVP and change-control process                                      |
| Deployment incompatibility        | Use Docker, documented environments and early deployment testing                       |
| Skills gaps                       | Pair members, assign scoped tasks, conduct reviews and record training actions         |

---

# 12. Client Decision and Evidence Register

The entries below separate decisions supported by the meeting transcript from items that still require formal written confirmation.

## Decision 1 — Creation of a centralised open dataset

**Decision:**
The client confirmed that the project should create a centralised open dataset for autonomous mining equipment and deployment information.

**Reason:**
The client had not identified an existing open dataset that could simply be linked to or reused. The lack of such a dataset is a primary reason for undertaking the project.

**Impact:**
The centralised database is a core project deliverable. The project will not be limited to presenting links to external websites. It will store structured records, evidence metadata, verification status and geographic information.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — verbally confirmed during the client meeting; written confirmation pending.

---

## Decision 2 — Market analysis as a core purpose

**Decision:**
The client confirmed that the portal should support users in understanding equipment numbers, automation levels, leading suppliers and market opportunities.

**Reason:**
The value of the portal is not only storing records but also allowing users to understand and analyse the autonomous mining market.

**Impact:**
The MVP will include search, filtering, GIS visualisation and analytics. The project will also prepare the structured foundation for market and analytics report generation.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — verbally confirmed during the client meeting; written confirmation pending.

---

## Decision 3 — RCT as a representative industry user

**Decision:**
The client identified RCT Global as a representative real-world user of the portal and arranged a stakeholder requirements meeting.

**Reason:**
RCT develops mining automation and control systems and may use the portal to retrieve, understand and analyse market information.

**Impact:**
The team will present the prototype to RCT, ask targeted questions about required fields, analytics and reports, and incorporate relevant feedback into the requirements and MVP.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — stakeholder meeting arranged; detailed RCT requirements pending.

---

## Decision 4 — Crowdsourced submissions

**Decision:**
The client supported a crowdsourced model in which users can submit new information through the portal.

**Reason:**
A complete central source does not currently exist, and the dataset will need to grow through contributions from people and organisations with relevant knowledge.

**Impact:**
The MVP will include a public submission form, evidence fields, validation, verification status and an administration workflow.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — verbally supported during the client meeting; final submission rules pending confirmation.

---

## Decision 5 — Immediate visibility of unverified submissions

**Decision:**
The client requested that new submissions become visible promptly under an unverified status.

**Reason:**
The client did not want publication to be delayed until the complete verification process had finished. Users should be able to view recent submissions while still recognising that they have not been verified.

**Impact:**
New records will be published as `Unverified`. The default public view will prioritise verified records, and users will have an option to view unverified submissions.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — verbally confirmed during the client meeting; security and moderation controls remain subject to implementation review.

---

## Decision 6 — Human-controlled verification

**Decision:**
The project will retain an administrator or authorised reviewer who can approve or reject submitted information.

**Reason:**
Public submissions and AI-generated assessments may be incomplete or incorrect. A human decision is required before a record receives verified status.

**Impact:**
The MVP will include an administration interface, evidence review, verification reports and approve, reject or request-more-evidence actions. The LLM will provide a recommendation only.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — direction supported during the client discussion; detailed reviewer roles pending confirmation.

---

## Decision 7 — LLM-assisted evidence assessment

**Decision:**
The client requested that the team investigate an LLM-based mechanism that checks submitted information, searches for supporting evidence and produces a recommendation report with sources.

**Reason:**
Manually checking every company, equipment model, deployment, technology provider, date and quantity would require significant reviewer effort. An AI-assisted process can prepare an evidence report for human review.

**Impact:**
The planned system will extract claims, search for evidence, retrieve relevant passages and generate a structured verification report containing source citations.

**Approval status:**
The transcript initially described this capability as a stretch feature. The team currently proposes including an initial version in the MVP because the client subsequently expressed a clear desire for the mechanism. Formal written confirmation of whether it is a required MVP deliverable is still needed.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — concept verbally endorsed; MVP classification pending written confirmation.

---

## Decision 8 — Evidence-backed verification reports

**Decision:**
The verification mechanism should produce a report rather than only returning a simple pass or fail result.

**Reason:**
Different parts of a submission may have different evidence outcomes. For example, the company and equipment model may be supported while the deployment quantity remains unverified.

**Impact:**
The report will assess claims individually and use statuses such as:

* Supported.
* Partially supported.
* Contradicted.
* Insufficient evidence.
* Not applicable.

Every supported or contradicted claim will include traceable evidence where available.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — verbally supported through the verification-bot example; final report format pending confirmation.

---

## Decision 9 — Centralised data and RAG will support reporting

**Decision:**
The team proposes using the centralised database and RAG system for both verification reporting and market-analysis reporting.

**Reason:**
The database can provide reliable structured totals and filters, while RAG can retrieve contextual evidence and case studies. Combining them enables quantitative reports with source-backed explanations.

**Impact:**
The project will support:

* Claim-level verification reports as an MVP capability.
* Initial evidence-grounded market summaries where feasible.
* More advanced natural-language and configurable report generation as an enhancement if time permits.

**Approved by:**
Team proposal based on client objectives, 6 August 2026 — requires client confirmation.

---

## Decision 10 — Batch data contribution

**Decision:**
The system may support semi-manual spreadsheet imports for organisations that can provide larger datasets, but this will not be the primary public contribution method.

**Reason:**
The client considered trusted accounts and batch uploads useful but expected that only a small number of contributors would provide complete databases. A contact and semi-manual import process was considered more realistic.

**Impact:**
The MVP may include a documented CSV template and administrator-assisted import process. Fully automated external database integration is outside the initial MVP.

**Approved by:**
Dr Adrian Boeing, 6 August 2026 — concept verbally supported; detailed implementation priority pending confirmation.

---

## Decision 11 — Prototype and scope review

**Decision:**
The client requested access to the prototype and offered to review the project scope and planning material before submission.

**Reason:**
Early review allows missing requirements and usability issues to be identified before the scope is finalised.

**Impact:**
The team will provide the prototype, scope of work and Gantt chart early enough to receive client feedback.

**Approved by:**
Dr Adrian Boeing, 6 August 2026.

---

# 13. Items Requiring Further Client Confirmation

The following items should be confirmed during the next client or RCT meeting:

1. Whether the LLM verification mechanism is a required MVP deliverable or a stretch deliverable.

2. Whether one record represents:

   * an individual physical machine;
   * a fleet deployment;
   * or both.

3. The minimum required fields for each deployment.

4. The exact verification criteria.

5. The source types considered authoritative.

6. Whether one source is sufficient or multiple independent sources are required.

7. The automation-level classification to use.

8. Whether unverified records should be searchable by all public users.

9. Whether contributor accounts are required.

10. Whether trusted industry accounts should receive different treatment.

11. The minimum quantity of real verified records required for the final demonstration.

12. The required report types and export formats.

13. Whether market-report generation belongs in the MVP or an enhancement stage.

14. UWA hosting, authentication and external-service constraints.

15. The person authorised to provide final written approval of the MVP.
