# Risk, Skills and Technology Assessment

The team assessed the technology choices, available skills and project risks against the requirements of the MVP [3][7]. The aim was to use technologies the team can realistically deliver within the project timeframe while still supporting the core requirements for GIS visualisation, analytics, crowdsourced data collection and verification. Technologies unfamiliar to the team, particularly PostGIS, were identified early so that they can be prototyped before they become critical dependencies.

## Technology Architecture and Justification

### MVP Architecture

![High-Level Technology Architecture for the MVP](../images/mvp_architecture.pdf)

The MVP uses a React frontend [9], a Node.js/Express backend [10][11] and a PostgreSQL/PostGIS database [12][13]. The frontend is deployed separately on Vercel [19], while the backend and database run locally under Docker Compose [17] and can later be deployed to AWS [20].

The project has one backend and a strongly related relational data model, so separating the system into independently deployed services would add integration, deployment and communication overhead without a clear benefit at this scale. The backend is instead organised into modules for deployments, contributions, administration and analytics.

The repository also contains a `services` area, reserved for optional future functionality such as AI-assisted evidence verification. RAG is not a dependency of the MVP and can be added later as a separate service without changing the core architecture [1][7].

**The stack is not frozen.** The facilitator confirmed that a technology choice may be revised later, provided the reason for the change and the trade-off accepted are documented in the final report [34]. The case in view is the backend host: Node.js was chosen because the members responsible for backend work are experienced in it, but the later LLM and retrieval work may be better hosted in Python. That capability sits outside the MVP, so the decision is deferred rather than taken now.

### Technology Decisions

\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{>{\raggedright\arraybackslash}p{2.8cm} >{\raggedright\arraybackslash}p{3.6cm} >{\raggedright\arraybackslash}p{3.1cm} p{5.1cm}}
\hline
\textbf{Decision} & \textbf{Alternatives considered} & \textbf{Chosen approach} & \textbf{Justification} \\
\hline
\endfirsthead
\hline
\textbf{Decision} & \textbf{Alternatives considered} & \textbf{Chosen approach} & \textbf{Justification} \\
\hline
\endhead
Frontend & React selected directly based on existing team experience & \textbf{React} & At least three members already have React experience. It suits the interactive map, dashboard, filters and forms the MVP requires, and existing experience reduces implementation risk. \\
Backend & Python FastAPI, Node.js/Express & \textbf{Node.js + Express} & The members responsible for backend development already have Node.js/Express experience, and JavaScript can be used across both frontend and backend. \\
Application architecture & Microservices, modular client-server architecture & \textbf{Modular client-server architecture} & Microservices were considered but would introduce unnecessary deployment and integration complexity for the current project size. The backend can still be separated internally into clear modules. \\
API & REST, GraphQL & \textbf{REST with JSON} & The MVP performs CRUD, search, filtering, analytics and moderation operations. REST is straightforward to implement, test and integrate with React. \\
Database & MySQL, PostgreSQL & \textbf{PostgreSQL + PostGIS} & The data has strong relationships between sites, deployments, companies, equipment and technology products. PostGIS provides the geospatial functions the map uses, and PostgreSQL leaves an extension path for document chunks and vector search if RAG is implemented later. \\
GIS & Commercial mapping platforms, Leaflet & \textbf{Leaflet} [14] & Lightweight and open source, and sufficient for mine-site mapping without making the MVP dependent on a commercial mapping platform. \\
Analytics visualisation & Chart.js, Recharts & \textbf{Recharts} [15] & Integrates naturally with React and is sufficient for the required counts, market shares, category comparisons and time series. \\
Styling & Plain CSS, CSS frameworks & \textbf{Tailwind CSS} [16] & Supports faster development and more consistent styling across multiple frontend contributors. \\
Authentication & External SSO, server-managed authentication & \textbf{Session cookie authentication for the MVP} & Keeps the MVP independent of an external identity provider. Administrative requests carrying cookies also use CSRF protection. \\
Development environment & Manual local setup, containerised environment & \textbf{Docker Compose} & Provides a reproducible environment for the backend and PostgreSQL/PostGIS and reduces differences between members' machines. \\
CI/CD & Manual build and test process, automated pipeline & \textbf{GitHub Actions} [18] & Integrates with the existing GitHub workflow and runs build and test checks automatically on every change submitted. \\
Source control and planning & Separate development and project tools & \textbf{GitHub + GitHub Projects} [31] & Keeps branches, pull requests, review, issues and task tracking in one environment already used by the team. \\
\hline
\end{longtable}
\normalsize

Hosting is proposed rather than settled. The frontend is planned for Vercel [19], and the backend and PostgreSQL/PostGIS database for local deployment under Docker with later hosted deployment on AWS [20], which together serve development and client demonstrations. Production is the UWA-provided environment described in Section 3. Both proposals remain provisional until Q-4 is answered, which asks what that environment provides and what may be installed in it [7]. Keeping the backend containerised reduces dependence on any particular platform, so redeployment into the UWA environment does not require the architecture to change.

## Team Skills Assessment

The team has different strengths across frontend, backend, database, DevOps and business analysis. Existing experience covers most of the core web stack, but several areas require additional learning.

\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{>{\raggedright\arraybackslash}p{3.1cm} >{\raggedright\arraybackslash}p{4.7cm} >{\raggedright\arraybackslash}p{2.4cm} p{4.1cm}}
\hline
\textbf{Skill required} & \textbf{Current capability} & \textbf{Gap} & \textbf{Action} \\
\hline
\endfirsthead
\hline
\textbf{Skill required} & \textbf{Current capability} & \textbf{Gap} & \textbf{Action} \\
\hline
\endhead
React frontend development & At least three members have previous React experience. M5 is responsible for frontend and GIS work. & Low & Experienced members review more complex frontend work, and reusable components are shared across the project. \\
Node.js / Express & M1 and M3 have previous experience. M3 is responsible for the backend and API. & Low & Establish the backend structure early and use pull-request review to maintain consistency. \\
PostgreSQL / SQL & The team has previous SQL and database experience, and M4 is responsible for database development. & Low--Medium & Develop and test the schema early using representative synthetic data. \\
PostGIS & No previous project experience has been identified. & High & Build a small geospatial prototype early, work from the documentation, and have a more experienced member review the implementation before wider integration. \\
GIS integration & M5 holds frontend responsibility and Leaflet has been selected. & Medium & Prototype the complete flow from database coordinates \textrightarrow{} REST API \textrightarrow{} Leaflet marker before developing more advanced GIS functions. \\
Testing & Most members have experience with unit and system testing, mainly using Python and pytest. & Medium, in JavaScript testing tools & Transfer existing testing practice to the JavaScript stack using small examples before building the full automated suite. \\
DevOps / Docker & M1 has Docker and technical integration experience. & Low & Maintain the Docker Compose configuration throughout development and test both local and hosted deployment before final delivery. \\
Cybersecurity & M1 has cybersecurity experience; other members have relevant course knowledge. & Medium across the wider team & Security-sensitive work is reviewed by M1, and the team works to an OWASP-based checklist during development and testing. \\
Accessibility & The team understands the accessibility requirements but has no dedicated specialist. & Medium & Use Lighthouse together with manual frontend checks as part of QA. \\
RAG / AI & M1 owns AI integration, but RAG is an identified skills gap. & High, but outside the core MVP & If the extension is undertaken, start with a small prototype and evaluate it separately before integrating it with the main application. \\
\hline
\end{longtable}
\normalsize

PostGIS is the only high-priority gap inside the MVP, and it is addressed in Sprint 1 rather than at integration: the map slice is prototyped end to end, from stored coordinates through the API to a rendered marker, before any further GIS work begins.

## Resources and Constraints

\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{>{\raggedright\arraybackslash}p{3.0cm} >{\raggedright\arraybackslash}p{6.5cm} p{6.5cm}}
\hline
\textbf{Resource / constraint} & \textbf{Current position} & \textbf{Impact / response} \\
\hline
\endfirsthead
\hline
\textbf{Resource / constraint} & \textbf{Current position} & \textbf{Impact / response} \\
\hline
\endhead
Team capacity & Six members with defined responsibilities across project coordination, frontend, backend, database, DevOps and AI, and QA. Each member is expected to contribute at least eight hours per week outside scheduled classes and meetings & Approximately 48 person-hours per week. Work is divided by primary ownership and allocated through GitHub Projects, with peer review where skill gaps exist and reallocation when workload is uneven \\
Development tooling & GitHub, GitHub Projects, GitHub Actions and Docker Compose are available to the team & Supports source control, planning, automated checks and a reproducible development environment \\
Hosting & Vercel for the frontend, and local Docker with later AWS deployment for the backend and database & Provides a workable development and demonstration path. The UWA hosting requirements are unconfirmed pending Q-4 [7] \\
Budget & No budget has been confirmed. Whether funding exists for hosting or third-party services, during the project or after handover, is open question Q-4.10 [7] & The MVP uses only free or self-hosted components. A paid service will not be adopted without a confirmed budget owner, since a dependency that lapses after the semester leaves the system unusable \\
Development data & A documented synthetic dataset is built in Sprint 1 & Allows frontend, backend, GIS and analytics work to proceed without waiting for industry data \\
Real seed data & The client has approached organisations including Rio Tinto and BHP, and the representative users have been asked for an export. Nothing has been received & Treated as a future resource rather than a dependency for initial MVP development. Any market-share measure remains provisional until real records exist \\
\hline
\end{longtable}
\normalsize

## Risk Register

Likelihood (L) and Impact (I) are rated High, Medium or Low.

\small
\setlength{\tabcolsep}{4pt}
\renewcommand{\arraystretch}{1.15}
\begin{longtable}{>{\raggedright\arraybackslash}p{0.95cm} >{\raggedright\arraybackslash}p{5.4cm} >{\raggedright\arraybackslash}p{2.35cm} >{\centering\arraybackslash}p{0.65cm} >{\centering\arraybackslash}p{0.65cm} >{\raggedright\arraybackslash}p{5.0cm} >{\centering\arraybackslash}p{0.8cm}}
\hline
\textbf{\#} & \textbf{Risk} & \textbf{Category} & \textbf{L} & \textbf{I} & \textbf{Mitigation} & \textbf{Owner} \\
\hline
\endfirsthead
\hline
\textbf{\#} & \textbf{Risk} & \textbf{Category} & \textbf{L} & \textbf{I} & \textbf{Mitigation} & \textbf{Owner} \\
\hline
\endhead
R-01 & Client availability delays answers to open questions or the provision of seed data, blocking dependent design and implementation decisions. & Client / Project & H & H & Consolidate blocking questions before each contact and track unresolved decisions with target dates. Where a decision cannot wait, adopt a documented and reversible working assumption and seek confirmation at the next contact. Escalate to the facilitator and unit coordinator where contact is not re-established. & M2 \\
R-02 & Real seed data is delivered late, is incomplete, or does not provide enough coverage for meaningful analytics [1][7]. & Data & H & H & Develop against a documented synthetic dataset so implementation is not blocked. Replace or supplement it with verified real data when it arrives. & M4 \\
R-03 & Integration problems occur between React, Express, PostgreSQL/PostGIS and Leaflet. & Technical & H & H & Integrate vertically from an early stage using small end-to-end prototypes rather than developing each layer independently until the end. & M1 \\
R-04 & Crowdsourced records contain incorrect, incomplete or duplicate information. & Data quality & H & H & New records remain unverified, evidence is collected, administrators review records, and validation and duplicate checks are applied where possible. & M4 \\
R-05 & Analytics are read as complete market statistics although the dataset has incomplete global coverage. & Data / Business & H & H & State that measures are computed over recorded deployments, and disclose coverage limitations where they are displayed. & M2 \\
R-06 & The final deployment environment differs from the local development environment or does not provide the expected capabilities. & Technical / Deployment & M & H & Keep the backend and database containerised and test both local and hosted deployment before final delivery. Contingencies for each outcome are set out in Section 3. & M1 \\
R-07 & Uneven technical experience across members delays implementation or produces inconsistent work. & Team & H & M & Clear ownership, peer review, support from more experienced members, and small prototypes for unfamiliar technology. & M2 \\
R-08 & Additional stakeholder requests increase project scope after development has started [1][2][3]. & Project & M & M & Use the proposed MVP scope and the MoSCoW priorities as the working baseline for the team until the client confirms it. New requests are assessed and recorded in the backlog before being added to committed work. & M2 \\
R-09 & The public contribution interface is abused through spam or malicious input. & Cybersecurity & L & M & CAPTCHA, rate limiting, server-side validation and controlled handling of submitted URLs. & M1 \\
\hline
\end{longtable}
\normalsize

## Cybersecurity Considerations

The MVP accepts public submissions, administrator actions and contributor-supplied URLs, so security controls are required even though the system is not intended to hold significant personal information.

\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{>{\raggedright\arraybackslash}p{4cm} >{\raggedright\arraybackslash}p{4.4cm} p{6.7cm}}
\hline
\textbf{Area} & \textbf{Main risk} & \textbf{Planned control} \\
\hline
\endfirsthead
\hline
\textbf{Area} & \textbf{Main risk} & \textbf{Planned control} \\
\hline
\endhead
Authentication and authorisation & Unauthorised users reach administrative functions & Server-side session authentication and backend authorisation checks on every protected administrative endpoint [26] \\
CSRF & An attacker causes a signed-in administrator's browser to send an unwanted state-changing request & CSRF token required for authenticated \texttt{POST}, \texttt{PUT}, \texttt{PATCH} and \texttt{DELETE} requests [21] \\
SQL injection & User input changes the meaning of a database query & Parameterised queries or equivalent safe database access; no concatenation of user input into SQL [22] \\
XSS & Contributor content executes as JavaScript in another user's browser & Contributor text is treated as plain text and escaped on output [23] \\
Public submission abuse & Automated spam or excessive API requests & CAPTCHA [28], rate limiting and server-side validation \\
Evidence URLs and SSRF, not in the MVP & The MVP does not fetch submitted URLs; a reviewing administrator opens them in a browser. If server-side retrieval is added later for the automated evidence check (FR-55, a Could item), a submitted URL could cause the backend to reach an internal resource & Restrict URL schemes, block private and loopback addresses, and apply request timeout and response-size limits [25] \\
File uploads, not in the MVP & The MVP accepts evidence as links only, so no upload path is exposed. If media upload is added in a later release, malicious, unsupported or oversized files become a risk & Restrict accepted file types and sizes, validate server-side and use safe storage names [24] \\
Session security & Administrative session cookies are stolen or misused & \texttt{HttpOnly} and \texttt{Secure} in production, appropriate \texttt{SameSite} settings and controlled session expiry [26] \\
Secrets & Database credentials or application secrets are committed to GitHub & Local secrets in \texttt{.env}, excluded by \texttt{.gitignore}, and environment variables in hosted environments [27] \\
Dependency security & A vulnerable third-party package is introduced & Review dependencies and run build, test and security checks in the CI workflow \\
Credential security & Administrator passwords are exposed if credential storage is compromised & Store passwords using a strong password-hashing algorithm such as Argon2 or bcrypt; never store plaintext \\
Transport security & Credentials, session cookies or submitted data are intercepted in transit & HTTPS for all production browser-to-backend communication \\
\hline
\end{longtable}
\normalsize

These controls implement NFR-03 to NFR-07 of the requirements specification [7]. Administrative rules are enforced in the Node.js/Express backend rather than by hiding controls in the frontend, and security-sensitive changes are reviewed by M1.