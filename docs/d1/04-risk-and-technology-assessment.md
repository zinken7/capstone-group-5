# Risk, Skills and Technology Assessment

The team assessed the technology choices, available skills and project risks against the requirements of the MVP [3][7]. The aim was to use technologies that the team can realistically deliver within the project timeframe while still supporting the core requirements for GIS visualisation, analytics, crowdsourced data collection and verification.

The MVP therefore uses a relatively simple modular client-server architecture rather than introducing microservices at this stage [3]. Technologies that are unfamiliar to the team, particularly PostGIS, have been identified early so that they can be prototyped before they become critical dependencies [13].

## Technology Architecture and Justification

### MVP Architecture

![High-Level Technology Architecture for the MVP](../images/mvp_architecture.pdf)

The MVP uses a React frontend [9], a Node.js/Express backend [10][11] and a PostgreSQL/PostGIS database [12][13]. The frontend is deployed separately on Vercel [19], while the backend and database can run locally using Docker Compose [17] and later be deployed to AWS [20].

Microservices were considered but were not selected for the core MVP. The current project has one main backend and a strongly related relational data model, so separating the system into independently deployed services would add integration, deployment and communication overhead without providing a clear benefit at the current scale. Instead, the backend will be organised into separate modules for areas such as deployments, contributions, administration and analytics.

The repository also contains a `services` area. This is reserved for optional future functionality such as AI-assisted evidence verification. RAG is not a dependency of the MVP and can be added later as a separate service without changing the core architecture [6].

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
Frontend & No formal framework comparison was required & \textbf{React} & At least three team members already have React experience. It is well suited to the interactive map, dashboard, filters and forms required by the MVP, while existing team experience reduces implementation risk. \\
Backend & Python FastAPI, Node.js/Express & \textbf{Node.js + Express} & The members responsible for backend development already have Node.js/Express experience. It also allows JavaScript to be used across both the frontend and backend. \\
Application architecture & Microservices, modular client-server architecture & \textbf{Modular client-server architecture} & Microservices were considered but would introduce unnecessary deployment and integration complexity for the current project size. The backend can still be separated internally into clear modules. \\
API & REST, GraphQL & \textbf{REST with JSON} & The MVP mainly performs CRUD, search, filtering, analytics and moderation operations. REST is straightforward to implement, test and integrate with React. \\
Database & MySQL, PostgreSQL & \textbf{PostgreSQL + PostGIS} & The project data has strong relationships between sites, deployments, companies, equipment and technology products. PostGIS also provides the geospatial functions required by the map. PostgreSQL leaves an extension path for document chunks and vector search if RAG is implemented later. \\
GIS & Commercial mapping platforms, Leaflet & \textbf{Leaflet} [14] & Leaflet is lightweight, open source and provides the functionality required for mine-site mapping without making the MVP dependent on a commercial mapping platform. \\
Analytics visualisation & Chart.js, Recharts & \textbf{Recharts} [15] & Recharts integrates naturally with React and is sufficient for the required counts, market shares, category comparisons and time-series charts. \\
Styling & Plain CSS, CSS frameworks & \textbf{Tailwind CSS} [16] & Tailwind can support faster development and more consistent styling across multiple frontend contributors. \\
Authentication & External SSO, server-managed authentication & \textbf{Session cookie authentication for the MVP} & Session authentication keeps the MVP independent of an external identity provider. Administrative requests using cookies will also use CSRF protection. \\
Development environment & Manual local setup, containerised environment & \textbf{Docker Compose} & Provides a reproducible environment for the backend and PostgreSQL/PostGIS and reduces differences between team members' machines. \\
CI/CD & Manual build and test process, automated pipeline & \textbf{GitHub Actions} [18] & Integrates with the existing GitHub workflow and allows build and test checks to run automatically when changes are submitted. \\
Source control and planning & Separate development/project tools & \textbf{GitHub + GitHub Projects} [18] & Keeps branches, pull requests, review, issues and task tracking in one environment already used by the team. \\
\hline
\end{longtable}

The frontend will initially be hosted on Vercel. The backend and PostgreSQL/PostGIS database will support both Docker-based local deployment and hosted deployment on AWS. Keeping the backend containerised reduces dependence on a particular hosting platform and makes later deployment or handover easier.

## Team Skills and Resources Assessment

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
React frontend development & At least three members have previous React experience. M5 is responsible for frontend/GIS work. & Low & Experienced members will review more complex frontend work and reusable components will be shared across the project. \\
Node.js / Express & M1 and M3 have previous experience. M3 is responsible for the backend/API. & Low & Establish the backend structure early and use pull-request review to maintain consistency. \\
PostgreSQL / SQL & The team has previous SQL/database experience and M4 is responsible for database development. & Low–Medium & Develop and test the schema early using representative fake data. \\
PostGIS & No previous project experience has been identified. & High & Build a small geospatial prototype early, use documentation/tutorials and have stronger technical members review the implementation before wider integration. \\
GIS integration & M5 has frontend responsibility and Leaflet has been selected. & Medium & Prototype the complete flow from database coordinates → REST API → Leaflet marker before developing more advanced GIS functions. \\
Testing & Most members have experience with unit and system testing, mainly using Python/pytest. & Medium gap in JavaScript testing tools & Transfer existing testing practices to the JavaScript stack using small examples and documentation before building the full automated test suite. \\
DevOps / Docker & M1 has Docker and technical integration experience. & Low & Maintain Docker Compose configuration throughout development and test both local and hosted deployment before final delivery. \\
Cybersecurity & M1 has cybersecurity experience; other members have relevant course knowledge. & Medium across the wider team & Security-sensitive work will be reviewed by M1 and the team will use an OWASP-based security checklist during development and testing. \\
Accessibility & The team understands the accessibility requirements but does not have a dedicated accessibility specialist. & Medium & Use Lighthouse together with manual frontend checks as part of QA. \\
RAG / AI & M1 owns AI integration, but RAG is an identified skills gap. & High, but outside the core MVP & If the extension is undertaken, start with a small prototype and evaluate it separately before integrating it with the main application. \\
\hline
\end{longtable}

The main MVP skills gap is **PostGIS**, as it is required for the core GIS functionality but is new to the team. The team will address unfamiliar technology by building small prototypes first, using documentation and tutorials, and having stronger members review work from members with less experience.

The same approach will be used for security and other unfamiliar areas rather than leaving skills gaps until the final integration stage.

## Risk Register

Likelihood (L) and Impact (I) are rated High, Medium or Low.

\small
\setlength{\tabcolsep}{4pt}
\renewcommand{\arraystretch}{1.15}
\begin{longtable}{>{\raggedright\arraybackslash}p{0.75cm} >{\raggedright\arraybackslash}p{5.6cm} >{\raggedright\arraybackslash}p{2.35cm} >{\centering\arraybackslash}p{0.65cm} >{\centering\arraybackslash}p{0.65cm} >{\raggedright\arraybackslash}p{5.0cm} >{\centering\arraybackslash}p{0.8cm}}
\hline
	\textbf{\#} & \textbf{Risk} & \textbf{Category} & \textbf{L} & \textbf{I} & \textbf{Mitigation} & \textbf{Owner} \\
\hline
\endfirsthead
\hline
	\textbf{\#} & \textbf{Risk} & \textbf{Category} & \textbf{L} & \textbf{I} & \textbf{Mitigation} & \textbf{Owner} \\
\hline
\endhead
1 & The final deployment environment differs from the local development environment or does not provide the expected capabilities. & Technical / Deployment & M & H & Keep the backend and database containerised with Docker and test both local and AWS-hosted deployment before final delivery. & M1 \\
2 & Real seed data is delivered late, is incomplete, or does not provide enough coverage for meaningful analytics [4][5]. & Data & H & H & Develop using controlled fake data so implementation is not blocked. Replace or supplement it with verified real data when available. & M4 \\
3 & Additional stakeholder requests increase project scope after development has started [1][2][3]. & Project & L & M & Use the agreed MVP and MoSCoW priorities as the scope baseline. New requests will be assessed before being added to committed work. & M2 \\
4 & Integration problems occur between React, Express, PostgreSQL/PostGIS and Leaflet. & Technical & H & H & Integrate vertically from an early stage using small end-to-end prototypes instead of developing each layer independently until the end. & M1 \\
5 & Uneven technical experience across team members delays implementation or produces inconsistent work. & Team & H & M & Use clear ownership, peer review, stronger-member support and small prototypes for unfamiliar technologies. & M2 \\
6 & Crowdsourced records contain incorrect, incomplete or duplicate information. & Data quality & H & H & New records remain unverified, evidence is collected, administrators review records, and validation/duplicate checks are applied where possible. & M4 \\
7 & The public contribution interface is abused through spam or malicious input. & Cybersecurity & L & M & Use CAPTCHA, rate limiting, server-side validation and controlled file/URL handling. & M1 \\
8 & Analytics are interpreted as complete market statistics even though the database has incomplete global coverage. & Data / Business & H & H & Clearly state that analytics are calculated from recorded deployments and disclose dataset coverage limitations where appropriate. & M2 \\
\hline
\end{longtable}

## Cybersecurity Considerations

The MVP accepts public submissions, administrator actions, URLs and uploaded evidence, so security controls are required even though the system is not intended to store large amounts of sensitive personal information.

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
Authentication and authorisation & Unauthorised users access administrative functions & Server-side session authentication and backend authorisation checks on all protected admin endpoints [26] \\
CSRF & An attacker causes a logged-in administrator's browser to send an unwanted state-changing request & CSRF token required for authenticated `POST`, `PUT`, `PATCH` and `DELETE` requests [21] \\
SQL injection & User input changes the meaning of a database query & Parameterised queries or equivalent safe database access; no direct concatenation of user input into SQL [22] \\
XSS & Contributor content executes as JavaScript in another user's browser & Contributor text is treated as plain text and safely escaped when rendered [23] \\
Public submission abuse & Automated spam or excessive API requests & CAPTCHA [28], rate limiting and server-side validation \\
File uploads & Malicious, unsupported or oversized evidence files are submitted & Restrict accepted file types and sizes, validate files server-side and use safe storage names [24] \\
Evidence URLs / SSRF & A submitted URL causes the backend to access an internal or unsafe network resource & Restrict URL schemes, block private/loopback addresses and apply request timeout and response-size limits [25] \\
Session security & Administrative session cookies are stolen or misused & Use `HttpOnly`, `Secure` in production, appropriate `SameSite` settings and controlled session expiry [26] \\
Secrets & Database credentials or application secrets are committed to GitHub & Store local secrets in `.env`, exclude them using `.gitignore`, and use environment variables in hosted environments [27] \\
Dependency security & A vulnerable third-party package is introduced & Review dependencies and include build/test/security checks in the CI workflow \\
Credential security & Admin passwords are exposed if credential storage is compromised & Store passwords using a strong password-hashing algorithm such as Argon2 or bcrypt; never store plaintext passwords \\
Transport security & Session cookies, credentials or submitted data are intercepted in transit & Use HTTPS for all production browser-to-backend communication \\
\hline
\end{longtable}

Administrative security rules will be enforced by the Node.js/Express backend rather than relying on hidden frontend controls. M1 will review security-sensitive changes, while the wider team will use course knowledge and an OWASP-based checklist during implementation and testing.

Security will be considered throughout development rather than being left as a final-stage activity.
