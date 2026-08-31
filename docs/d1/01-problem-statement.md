\clearpage
\pagenumbering{arabic}

# Problem Statement and Key Deliverables

## Client and Context

The client is Dr Adrian Boeing of UWA. Two industry representative users have also contributed to the requirements: Yash Singh of RCT Global, working in market data analytics, and Milan Ivovic, Regional Business Manager for Asia Pacific at Epiroc. Both participated in the client and representative-user meeting on 11 August 2026 [1].

Their involvement helps ensure that the project addresses both the client's goal of creating an open dataset and the practical needs of industry users who use market information to understand technology adoption, competitor activity and potential opportunities.

## The Problem

Information about autonomous and teleremote mining equipment is currently fragmented across company announcements, mine-site reports, industry publications and commercial market reports. Much of the more complete market data is commercially held. The client reported that relevant market reports can cost in the order of $50,000 to $100,000, placing them beyond many startups, smaller suppliers and academic researchers [2]. No comparable open dataset was found to exist [2].

This creates a practical problem for organisations trying to understand the market. Information can be difficult to obtain, slow to update and hard to independently verify. The representative users described cases where a supplier may only become aware of a competitor's presence after a large number of machines have already been deployed, or where changes in the automation technology used behind a machine brand may go unnoticed for months [1]. The usefulness of the data therefore depends not only on accuracy, but also on coverage and how quickly new information becomes visible.

Existing commercial dashboards do not fully solve this problem because their underlying data is not openly available for independent checking [1]. The project therefore needs to provide both a useful interface and an underlying dataset that users can inspect, contribute to and verify.

## Why the Client Wants This Software

The client's aim is to make this type of market information more openly accessible. The requested system is an open, crowdsourced alternative to commercial market databases, with the structured dataset intended for publication under a Creative Commons licence [3].

For industry users, the value is practical. The system should make it easier to answer questions such as:

* where autonomous and teleremote equipment is being deployed;
* which manufacturers and technology suppliers are involved;
* how many machines are recorded at particular sites or in particular markets;
* how adoption differs by country, equipment type or automation category; and
* where competitor activity or potential opportunities may be emerging.

For smaller organisations and researchers, the open dataset removes the need to rely entirely on expensive commercial reports. It also makes individual records more transparent. Evidence can be attached to contributed information and each record carries a visible verification state, allowing users to distinguish between submitted and reviewed data.

Openness is therefore part of the solution rather than an additional feature. Data anyone can obtain gets reused in ways its publisher did not plan for, and that is where its value comes from; McKinsey put the annual value of open data across seven sectors, one of them oil and gas, at more than $3 trillion [4]. The extractive industries already publish on this basis, so that reported figures can be checked rather than taken on trust [5]. Open-source software follows the same pattern, most of its value going to those who reuse the code rather than to those who wrote it [6]. A closed version of this system would leave the client's main concern untouched: that useful market information is hard to obtain and hard to verify.

## Proposed Solution

The project will build a web-based, crowdsourced and queryable geospatial database of autonomous and teleremote mining equipment.

The system will combine four main user-facing functions:

1. an interactive GIS map of mine sites and recorded deployments;
2. an analytics dashboard for market-level summaries and trends;
3. a searchable and exportable equipment register; and
4. a contribution and verification workflow for adding and correcting information.

The underlying data model will connect mine sites, companies, machine models, manufacturers, technology products, technology suppliers and equipment deployments. Records can also include evidence and a verification status.

The system is intended as a market reference dataset and presentation layer. It does not perform mine planning, fleet dispatch or operational control.

## Minimum Viable Product

The MVP is defined from the requirements currently prioritised **Must** in the Software Requirements Specification [7]. The status of client agreement to this scope is set out in Section 2.

\small
\setlength{\tabcolsep}{5pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{>{\raggedright\arraybackslash}p{0.7cm} >{\raggedright\arraybackslash}p{3.5cm} >{\raggedright\arraybackslash}p{8.0cm} p{2.5cm}}
\hline
\textbf{\#} & \textbf{Deliverable} & \textbf{MVP scope} & \textbf{Acceptance criteria} \\
\hline
\endfirsthead
\hline
\textbf{\#} & \textbf{Deliverable} & \textbf{MVP scope} & \textbf{Acceptance criteria} \\
\hline
\endhead
1 & \textbf{Core data model} & Store companies, mine sites, machine models, technology products and equipment deployments. Manufacturers and technology suppliers are represented separately, with deployment and automation information stored in structured form. & FR-01 to FR-11 \\
2 & \textbf{Interactive GIS map} & Display one marker per mine site, distinguish deployment status, show deployment details and allow filtering by technology supplier. & FR-15 to FR-19 \\
3 & \textbf{Analytics dashboard} & Provide headline totals, cumulative machines over time, counts by country and machine type, supplier/manufacturer share and filters that apply to the displayed measures. & FR-21 to FR-28 \\
4 & \textbf{Equipment register} & Provide a searchable, filterable and sortable view of deployment records with tabular export. & FR-36, FR-37 \\
5 & \textbf{Contribution and verification} & Allow users to submit new information and supporting evidence. New records carry a verification status, while authorised administrators can review, correct, approve or reject submissions. & FR-40 to FR-46 \\
\hline
\end{longtable}
\normalsize

Deliverables 2 to 5 correspond to the main user-facing functions requested by the client. Deliverable 1 provides the structured data foundation required by all four.

Because the dataset will initially cover only recorded deployments, analytics will describe the contents of the available dataset rather than claim to represent the complete global market. Coverage limitations will be made clear where appropriate.

## MVP Boundary and Out of Scope

The MVP focuses on establishing a complete working flow:

**collect data → review data → store structured records → explore the data through the map, register and analytics dashboard.**

AI-assisted evidence checking and Retrieval-Augmented Generation (RAG) are possible extensions but are not dependencies of the MVP. The core system must remain usable without an LLM, automated web search or AI verification service.

Other features outside the MVP include self-service bulk upload, institutional AAF authentication, automatic machine counting from photographs, fleet-management or dispatch functionality, market forecasting and a dedicated mobile application [7]; Section 2.3 records the reason for each. These exclusions keep the project focused on collecting, maintaining and presenting structured market data within the available project timeframe.