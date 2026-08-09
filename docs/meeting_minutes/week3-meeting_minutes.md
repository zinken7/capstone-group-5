# CITS5206 Capstone Project — Week 3 Meeting Minutes

- **Project:** Autonomous Mining Equipment Market Map
- **Client:** Dr Adrian Boeing
- **Prepared by:** Hans Lionar

---

## Project brief (reference)

Western Australia is a global leader in the adoption of autonomous mining technologies, but there is **no centralised, publicly accessible, verifiable repository tracking autonomous mining equipment globally**. This project builds a web-based, crowdsourced, queryable geospatial database cataloguing every autonomous mining machine ever deployed.

The deliverable is a full-stack web application providing:

- A **queryable database** of global autonomous mining assets
- A **verified crowdsourcing mechanism** allowing industry professionals to submit new kit data
- An **interactive GIS map layer** showing geographical asset distribution
- A **data analytics dashboard** visualising automation adoption trends across the industry

Example data to include:

| Area | Detail |
|---|---|
| **Equipment instance** | Type (truck, dozer, loader, drill), manufacturer (CAT, Komatsu, Liebherr), model, machine-specific metadata (e.g. max payload, operating weight) |
| **Technology & timeline** | Technology provider / integrator (e.g. RCT, ASI, CAT) and the specific deployment / commissioning date |
| **Geographic grouping** | Multi-layered grouping — individual machines → mine site → regional operations (e.g. "Pilbara Region Operations") → owning company |
| **Verification layer** | Equipment must link to evidence (URL to press release, news story, academic paper) to earn a verification mark |
| **Case studies & media** | Users can upload or link case studies, cross-referenced with companies, sites or equipment types |

Technology stack is entirely the team's choice, but should support deployment in a **UWA IT environment** as far as practical.

**To be confirmed:** what the UWA IT environment actually is — VM or shared hosting, shell/sudo and Docker access, available runtimes, whether PostgreSQL/PostGIS can be installed, internet-facing vs UWA-network only, authentication, and who provisions access. Not yet discussed with the client.

---

## Meeting 1 — Client Meeting #1

| | |
|---|---|
| **Date** | Thursday 6 August 2026 |
| **Location** | Room RM-226-250-EECE 250, UWA (in person) |
| **Duration** | ~56 minutes |
| **Client** | Dr Adrian Boeing |
| **Group attendees** | Hengan Weng (24201874), Shee Wang (24368932), Zerun Zhang (24389925), Hans Lionar (24661999), Zunhao Zhang (24758673), Tyrone Tran (24814799) |
| **Purpose** | Establish shared understanding of the problem, users, data sources and verification model; demonstrate early prototype |

### 1. Problem statement and motivation

- **The problem is that the data is closed and private.** Market reports covering this space do exist, but access typically costs **$50,000–$100,000**, and in Dr Boeing's assessment they are *"frankly not that good"*.
- This locks out the people who most need the information: **startups** who cannot spend $100,000 to find out what is happening in the market, **smaller companies**, and **academics** researching the space.
- The objective is therefore to **create an open, crowdsourced version and get the data back into the public domain**.
- The core questions the portal must help answer:
  - How many mining machines are in the market?
  - How many of those machines have this technology option fitted?
  - To what level — teleremote, or fully autonomous?
  - Who are the leading suppliers?
  - Where are the market opportunities?
- Dr Boeing confirmed **no such open dataset currently exists** — he has not found any provider offering one. *Creating that dataset is the reason the project exists*, so linking to an external source is not an option.

### 2. Target users and their needs

Dr Boeing identified **three distinct user groups**:

| User group | What they want from the portal |
|---|---|
| **Academics and researchers** (incl. Dr Boeing) | Market trends and country-vs-country comparisons; governments want to know where their country stands. From a **robotics** perspective specifically: which sensor technologies are winning — which laser scanner gets the most attention, whether the industry is **moving from laser scanners towards radar**, or towards cameras. Dr Boeing noted researchers' interests are broad and hard to predict, which is an argument for exporting raw data rather than pre-building every view. |
| **Startups** | Validating whether a product idea fits the market. Example: someone plans an autonomous truck — the portal should show that Australia and China are already saturated, or that large trucks are done while another segment is still open. Largely general market data. |
| **Established technology companies** (e.g. RCT) | Market opportunity and competitive landscape. Example given: **Brazil may have ~3,000 trucks but only ~40 autonomous**, and Brazil's conditions (large country, long distances) resemble Australia's — so the same technology could be deployed there. They also want the **competitor mix per market**: do buyers prefer a local supplier, Caterpillar (American), or Komatsu (Japanese)? |

### 3. What the website must do — three parts

Dr Boeing summarised the system as **three parts**. This is the clearest scope statement given in the meeting and should anchor the MVP:

| # | Part | Purpose |
|---|---|---|
| **1** | **Map** | A browsing and orientation tool. Someone curious — or someone starting from zero, e.g. *"I want to build an autonomous truck product for Australia and I don't know anything"* — pokes around the map and **learns as they go**. |
| **2** | **Dashboard of general market statistics** | Large-scale trends anyone would be interested in: *"Is it growing in Australia? Is Caterpillar taking over the world?"* |
| **3** | **Data extraction / export** | Users pull the dataset out of the database and run **their own deep analytics** — e.g. into Excel or a database analysis tool. |

- **Explicit scope limit:** *"the idea isn't that we create a dashboard for every specific little thing that people want to know."* The dashboard covers **mega-trends only**; anything specific is served by exporting the data.
- Worked example of the intended user journey: browse the map → learn the space → export the dataset → conclude something like *"Kalgoorlie is the place to go — lots of trucks and no technology yet"*.
- **The database is the real deliverable.** The map is the front door; the value is the data underneath it and the ability to get it out.

### 4. Map / geospatial requirements

- Dr Boeing wants **a section of the website that is essentially Google Maps with markers showing where the vehicles are**, plus information attached to each marker.
- "Where" means **which mine site** — a specific geolocation, not a country-level figure.
- Information wanted on each marker, based on the reference sites shown:
  - **Deployment status** — announcement only / testing / operational
  - How long it has been running, and what is coming next
  - The **operating area**
  - The **supplier**, so the map can be filtered by supplier to show where they operate
- **Timeline feature:** one reference site lets you scroll through time and watch the market evolve. Dr Boeing explicitly liked this.
- Specifics will **evolve over time**.

#### Reference sites — confirmed links

Both are maps of autonomous vehicles on public roads. These are the **agreed design inspiration** for the mining equivalent.

| Site | URL | What to take from it |
|---|---|---|
| **AV Map** | <https://avmap.io/> | Interactive map of AV deployments worldwide — Waymo, Tesla, Zoox, Apollo Go, WeRide, Nuro, Uber, Lyft. Shows **operators by city**, **service areas**, and a **time slider** to watch the market evolve. This is the one Dr Boeing liked for browsing by supplier and scrolling through time. |
| **Brad Templeton — Autonomy Map** | <https://www.templetons.com/brad/robocars/autonomap.html> | Maintained by a journalist/analyst in the space. Google Maps based, organised as **layers**: robotaxi, delivery, and a separate **testing** layer. Status is encoded by **marker colour** — red = no employee on board, blue = safety driver on board, orange = planned within the coming year. Clicking a marker gives more detail, **including who the technology supplier is**. |

**Directly transferable design decisions:**

- **Layers by category** — Templeton separates robotaxi / delivery / testing. The mining equivalent would be surface / underground, or by machine type.
- **Colour-coded status on the marker itself**, so the map is readable without clicking — maps onto announced / commissioning / testing / operational.
- **An explicit inclusion threshold.** Templeton requires a service to be ≥80% autonomous and operating on public streets to appear. The project needs its own equivalent rule — *what counts as an autonomous or teleremote machine for inclusion?* This is a real requirement, not a detail.
- **Honest data-quality labelling.** Templeton states plainly that many points are company-provided, not independently verified (particularly in China), and that locations are approximate. This is exactly the verified/unverified distinction Dr Boeing wants, and it is worth copying the candour as well as the mechanism.
- **A low-friction correction route** — Templeton accepts corrections by email or a Google Form and asks for a searchable address string rather than just a city name. Consistent with Dr Boeing's expectation that site-level staff will be the ones correcting records.

- **Action:** ask Dr Boeing for the remaining links he showed (the market report and the autonomous haul truck distribution chart) — the two map links above are now confirmed.

### 5. Dashboard — market statistics wanted

Statistics Dr Boeing pointed to as worth having on the dashboard:

| Statistic | Notes |
|---|---|
| **Market growth rate / CAGR** | Year-on-year increase, broken down **by country**. Is the market growing, dying, or levelling off? Dr Boeing called this *"the interesting part"*. |
| **Distribution by geography** | By country, continent or region. |
| **Percentage autonomous** | Flagged as something people care about a lot. Analogy: everyone wants to know what percentage of cars on the road are electric — same here. Example site cited was **Olive Downs Complex** (east coast). ⚠️ *The counts and percentage quoted in the meeting were inconsistent (32 trucks / 29 autonomous / "only 66%") — figures to be confirmed, but the metric itself is clear.* |
| **By technology supplier** | RCT, Sandvik, Amazon, etc. **This is the breakdown Dr Boeing personally wants.** |
| **By base machine manufacturer** | Caterpillar, Komatsu, XCMG, Volvo. |
| **By owner / operator** | BHP vs Rio Tinto etc. Dr Boeing said this is not his interest but others will want it. |
| **By payload** | Machine size distribution. |
| **Future / announced orders** | Who has announced orders and upcoming projects, so users can **project what future markets will look like**. |

### 6. Data model — the key early deliverable

Dr Boeing was explicit that after understanding the data and use cases, **the key next step is producing a data structure / ER diagram**. The hierarchy he sketched:

```
Company (e.g. Rio Tinto)
  └── Mine site
        └── Area / pit (pit 1, 2, 3 …)
              └── Machine (truck, dozer, excavator, …)
                    ├── Machine properties (make, model, payload capacity, …)
                    └── Technology kit (supplied by a technology company)
                          └── Sensors (supplied by another company again)
```

- **Warning — it is not actually a tree.** Dr Boeing used a **family tree** analogy: it *sounds* hierarchical, but when you build it you discover **many-to-many relationships** everywhere. He expects the same here. *"You'll probably find that different things relate in different ways."*
- The structure must also support a **reasonable flattening** — a denormalised export people can pull into Excel and analyse. Designing for both the relational structure and the flat export is part of the task.

**Fields mentioned explicitly:**

| Entity | Fields |
|---|---|
| **Mine site** | Name; **GPS location**; owner (e.g. BHP); **status** — operational vs being commissioned/testing (mines take years to start, so a commissioning phase is normal); **commodities** (coal, iron ore, …) |
| **Machine** | Manufacturer (Komatsu, Caterpillar, …); **model** (e.g. a Caterpillar 793); **size class** (e.g. "ultra class"); **quantity**; payload |
| **Technology kit** | Technology supplier / integrator; level of automation |
| **Sensors** | Sensor supplier and type — the deepest level, and Dr Boeing's personal interest |

### 7. Ownership, operators and contractors

Raised in response to a group question, and flagged by Dr Boeing as something he had not thought to mention — **treat this as a significant modelling requirement**:

- **A single mine site almost never has a single owner.** *"There's always at least five companies involved in owning any particular site or asset."*
- What looks like one company is often many. Dr Boeing's illustration: go to the **Rio Tinto building** in Perth, visitor floor, and the list of companies on the wall shows Rio Tinto is effectively **~50 companies**.
- Mine sites are commonly **joint ventures** — with a Chinese mining company, a Japanese steel mill that will buy the output, or a private owner of the land (Gina Rinehart was the example given).
- A typical chain is: **owner company → subsidiary that operates the site → contractor brought in to actually run the machines** (which the contractor may own or rent).
- **Mining contractors must be captured** — this is not a niche. The example given was an Australian mining contractor with a market cap around **$2 billion** whose entire business is mining contracting. ⚠️ *Company name unclear in the transcript — to be confirmed.*
- Implication: **company → site is many-to-many**, and roles (owner / operator / contractor / technology supplier) need to be modelled as relationships with a type, not as single fields.

### 8. Asset identity, movement and history

The group asked how to handle a machine moving between sites. Dr Boeing's answer:

- **Ideally** each asset has a **unique ID**, like a VIN on a car.
- **In practice** companies will not provide VINs or serial numbers.
- Machines **do not move between sites very often**, and technology kits are **not often transferred** from one vehicle to another — so this is not worth over-engineering.
- **Recommended approach:** keep a **`decommissioned` / no-longer-in-use flag** on the record and **create a new entry** at the new site, rather than modelling a move. Optionally add **valid-from / valid-to dates** to support the historical time-scroll on the map.

### 9. Machine types — surface and underground

- **Surface mining** is the familiar picture: trucks, dozers, excavators.
- **Underground mining is considerably more complex and varied.** Machine types mentioned:
  - **Load-haul-dump (LHD) / scoop tram** — drives around, scoops up material, dumps it. A common underground machine.
  - **Underground trucks** — different load profile from surface trucks because tunnels are small.
  - **Drills** — many kinds, single-boom and twin-boom.
  - **Scaling machines** — scrape loose rock down.
  - **Shotcrete machines** — spray concrete so the tunnel does not collapse.
  - Various platforms and, in Dr Boeing's words, *"a lot of weird and wonderful machines"*.
- **It is not just trucks** — the data model must accommodate a long and open-ended list of machine types.
- Dr Boeing will try to provide a **list of machine types**; in the meantime he suggested Googling or asking an AI for a list of underground mining machines.
- RCT's own website was described as one of the better references for machine types and the technology fitted to them.

### 10. Depth of technology detail required

This is the point that distinguishes this portal from existing market maps. It is **not enough to record that a machine exists at a location** — the portal must capture the **technology stack behind each deployment**:

| Layer | Question | Example |
|---|---|---|
| **Base machine manufacturer** | Who made the machine? | Caterpillar, Komatsu, Volvo, XCMG, Liebherr |
| **Owner / operator / contractor** | Who owns, operates and runs it? | Rio Tinto → subsidiary → contractor |
| **Technology supplier / integrator** | Who made the automation technology? | RCT, Sandvik, Mobileye, Aurora — or developed in-house, e.g. Rio Tinto commissioning the University of Sydney |
| **Sensors** | Which sensors, from whom? | Laser scanner / radar / camera — stretch depth |

- *"Who made the truck and who made the technology are not always the same thing."*
- Some companies **make** the technology; others **only buy and deploy** it. The portal should make clear which is which. In the automotive example Dr Boeing used, an operator (MOIA — transcript spelling uncertain) buys self-driving technology from **Mobileye** or **Aurora** rather than building it.
- Sensor-level detail is what Dr Boeing personally wants as a robotics researcher; he acknowledged the team may not be able to go that deep.

### 11. Market data — examples and coverage

- **Autonomous haul trucks** are where the most information and best market data exist. Data on **other equipment types is significantly harder to find**.
- Machine types in scope include **loaders, trucks, drills and dozers**, plus the underground machines above.
- Example figures shown (data approximately 2024, so already dated):
  - **Australia:** ~900–1,000+ autonomous haul trucks — historically the largest market
  - **China:** ~500 at the time, but Dr Boeing expects this is **now reversed** — Australia slightly over 1,000, China possibly 1,000–2,000
  - Data for Russia and Ukraine is unreliable given the conflict
- The point of the example: **who leads the market and how that shifts over time is exactly the trend users care about.**
- This is a **fast-moving industry**, and any dataset is only as good as the underlying data collection.

### 12. Data sources and seeding the dataset

- **Dr Boeing does not have data yet.** He had hoped to, and expects assembling it will take him a long time.
- He will **extract generic data from a market report** he has access to — only generic, because the report is owned by its publisher.
- He has approached **BHP and Rio Tinto**, and will ask **RCT**. These may take time; he expects **perhaps two of the three** to come through by the end of the project.
- **Expect varying levels of detail.** BHP is likely to share only vague, high-level information — e.g. *mine name, operator, Caterpillar, thirty trucks*, and possibly not even the machine model. RCT may be reluctant to share highly detailed information because they build the entire technology package.
- **Design implication:** the data model must tolerate **records at very different depths** — some entries fully specified down to sensors, others little more than a site and a count.

### 13. Verification and the crowdsourcing model

- **Why verification is needed:** without it *"anyone could type in any data they want… I have a million trucks and I'm number one."* Dr Boeing used the **Twitter/X green tick** as the mental model — a visible verified mark.
- A **small amount of verified data from day one** (the seeded data), with the **bulk arriving via crowdsourcing**.
- **Network effect expected:** like Facebook, once enough people use it, growth accelerates.
- **The bias problem is the engine.** If only BHP and Rio Tinto contribute, the statistics will be *valid but unrepresentative* — showing, say, Komatsu as the leading technology supplier. Caterpillar sees that, objects, and contributes their own data to correct it. Competitive correction is expected to drive contributions.
- **Corrections come from site level, not corporate.** Head office in Perth often does not know what is actually deployed on a remote site — *"he just knows what some guy told him ten years ago."* The people running the mine sites are the ones who will say *"actually we've got forty-three trucks"*. As Dr Boeing put it, *"people love to tell you you're wrong and correct information."*
- **Dr Boeing has not settled the verification process** — *"I haven't figured out the verification processes."* This is open for the team to propose.
- **Verification stretch goal — AI bot.** Reference example: **CSRankings**, a crowdsourced site with an "add faculty" flow, **open source on GitHub**. On submission an AI bot searches for supporting evidence and produces a categorised report — does the person exist, does the institution exist, is there a scholar profile — ending with an **overall summary recommendation** to approve or reject, possibly by email. Applied here, the criteria would be: does this technology supplier exist, do they have a website saying they make this technology, is there a media announcement (*"we're rolling out 1,000 trucks to this site"*) backing the claim.
  - Submitters should be asked to **include evidence links** in their submission.
  - Dr Boeing stressed this is a **stretch item** — *"if you get it done, also if you don't."*
- **Trusted accounts** (raised by the group): accepted as a good idea — submissions from known contributors could be treated as verified.
- **Bulk upload / batch import** (raised by the group): liked in theory, but Dr Boeing expects only **5–10 contributors** will ever hand over a whole database. Recommended approach is a **"Contact us"** link and a **manual or semi-manual import**, not a full self-service batch upload.
- The group also asked **who may submit data and how it can be guaranteed legally verified**. Dr Boeing's answer was candid: *"I don't know."* His suggestion was an **admin area** on the site, with anyone able to submit.

### 14. Evidence, metadata and case studies

- Following the Brad Templeton example, submissions should be able to link **many kinds of supporting material**: web pages, news items, **YouTube videos**, marketing brochures.
- These should be **linked together as metadata tags** so users can find related information — and the same links serve as the **source for verifying** a record.
- **Case studies** are of real interest to users. What people look for in them:
  - **Productivity increase**
  - **Safety improvements**
  - Features of the technology itself

### 15. Data freshness and visibility

- Expectation is **instant update on submission** — the record appears on the site immediately.
- The site should provide a **verified / unverified filter**, defaulting to verified. Analogy given: **Reddit's "best" (default) vs "new"**.
- This lets new submissions be visible immediately while verification (by Dr Boeing or a bot) happens asynchronously.

### 16. Client vs user distinction

- **Dr Adrian Boeing is the client** — he is commissioning the portal.
- **RCT Global is a representative end user** — they would use the portal to pull, understand and analyse the information.
- Dr Boeing has arranged a **follow-up meeting with RCT (contact: Yash) on Tuesday 11 August at 10:00 am, online**. The other UWA group working on the same topic will also attend.
- Purpose of that meeting is **requirements elicitation**. Dr Boeing intends to say very little and let the group demonstrate its prototype and ask questions directly. He asked the group to bring a **list of questions** — *"do you want this field? Do you want that field? Does it look good like that?"*
- Useful framing he suggested for that conversation: distinguish what is of interest to **everybody** from what is a **very specific** question about one commodity, one mining method and one vehicle type — the latter is served by data export rather than a built-in view.

### 17. Background — RCT Global

- RCT Global makes **automation and control systems for mining vehicles**, across several levels of technology.
- Their main product area is **teleremote**: the machine is not autonomous, but an operator sends commands remotely from a control station with cameras and fleet information. Higher automation levels exist (e.g. press a button and the machine drives A→B automatically).
- They supply this for **loaders, trucks, drills and dozers**.
- Technology fitted to machines includes **laser scanners, cameras (including rear-facing), antennas and electronics modules**.
- **Action:** the team is asked to get familiar with mining equipment types and read up on the different machines and technology options.

### 18. Prototype

- The group demonstrated a **prototype dashboard built as a single HTML page**, covering a **map**, **equipment exploration**, **filters**, a **verification indicator** and a **submit-data page**.
- Dr Boeing's reaction was positive — *"you guys have got going already, very nice"* and *"I'm very glad that you've done that dashboard."* He noted he had explained things the group already knew because the prototype existed.
- **Action:** send the HTML prototype to Dr Boeing so he can review it and flag obvious gaps.
- **Action (client):** Dr Boeing will attempt to **generate sample data**, though this may take longer.
- The prototype will be **demonstrated to RCT on Tuesday 11 August** to gather user feedback.

### 19. Upcoming deliverables

- Dr Boeing noted the group must submit a **Scope of Work document and a Gantt chart**.
- **Action:** send both to him **early**, before submission, so he can provide feedback.

### 20. Communication protocol (agreed)

| Channel | Use | Expected response |
|---|---|---|
| **MS Teams** | Fastest route; quick questions | Usually same day; **ping again if no reply** — he asked to be chased |
| **Email** | Concrete written feedback; formal records | Checked roughly once a day to every two days |
| **Recommended pattern** | Send the email → if not urgent, wait a day → Teams ping referencing the email | — |

- Dr Boeing noted he had previously confused this group with the other group working on the same topic, and apologised.
- On a single point of contact / project manager: he asked to **copy everyone** on correspondence, and noted other groups **rotate the role**.
- **Action (client, completed in meeting):** Dr Boeing added the group to the RCT meeting calendar invite. Anyone who did not receive it should get it forwarded from a teammate.

### 21. Client Meeting #1 — action items

| # | Action | Owner | Due |
|---|---|---|---|
| C1 | Send HTML prototype to Dr Boeing for review | Group | Before Tue 11 Aug |
| C2 | **Draft the data model / ER diagram** — company, site, pit/area, machine, technology kit, sensors, plus ownership and contractor relationships | Data / backend leads | Priority — start this week |
| C3 | Design the **flattened export format** alongside the relational model | Data / backend leads | With C2 |
| C4 | Prepare requirements-elicitation question list for RCT (fields, layout, workflows) | All | Before Tue 11 Aug 10:00 |
| C5 | Read up on mining machine types — surface **and underground** (LHD/scoop tram, underground trucks, drills, scaling, shotcrete) | All | Before Tue 11 Aug |
| C6 | Ask Dr Boeing for the remaining links (market report, haul-truck distribution chart) — map links now confirmed | One member | ASAP after meeting |
| C7 | Review [avmap.io](https://avmap.io/) and [Templeton's Autonomy Map](https://www.templetons.com/brad/robocars/autonomap.html); decide which features to adopt (layers, colour-coded status, supplier filter, time slider) | Front-end / GIS lead | Week of 10 Aug |
| C8 | Review CSRankings site and its GitHub repository as a reference for crowdsourced submission + AI verification | Tech leads | Week of 10 Aug |
| C8a | **Define the inclusion threshold** — what counts as an autonomous / teleremote machine for the dataset (cf. Templeton's ≥80% autonomous rule) | Group + Dr Boeing | Tue 11 Aug |
| C9 | Attend online requirements meeting with RCT (Yash) and demo prototype | All | Tue 11 Aug, 10:00 |
| C10 | Send Scope of Work + Gantt chart for early feedback | Group | Before submission deadline |
| C11 | Send through the links shown in the meeting | Dr Boeing | On request |
| C12 | Extract generic data from the market report and generate sample data | Dr Boeing | When available |
| C13 | Obtain data from BHP / Rio Tinto / RCT to seed the dataset | Dr Boeing | Ongoing |
| C14 | Provide a list of mining machine types | Dr Boeing | When available |
| C15 | Add group to RCT meeting invite | Dr Boeing | ✅ Done in meeting |

---

## Meeting 2 — Facilitator Meeting #1

| | |
|---|---|
| **Date** | Friday 7 August 2026 |
| **Format** | Online (MS Teams) |
| **Duration** | 12 minutes 24 seconds |
| **Facilitator** | Fudong Qin |
| **Group attendees** | Hengan Weng (24201874), Shee Wang (24368932), Zerun Zhang (24389925), Hans Lionar (24661999), Zunhao Zhang (24758673), Tyrone Tran (24814799) |
| **Purpose** | First facilitator check-in — requirements clarity, MVP definition, team allocation, process expectations |

### 1. Requirement clarity — data source

- The group raised that **the data source remains the biggest open question**. Dr Boeing has indicated that for an initial phase, private data from a partner company may be usable, with the long-term intent being a **crowdsourced platform**.
- **Fudong's guidance:** ask the client directly. Clients will often provide **dummy data**; using external data sources is possible but uncommon. **Do not rely on assumptions for unclear requirements.**
- The group confirmed it will make this concrete at the Tuesday meeting with Dr Boeing and the industry partner, who are the real users.

### 2. Meeting minutes

- Fudong asked the group to **summarise key points after every meeting** and to **rotate the minute-taking role** among members.
- **Hans takes the minutes for this meeting**; the role passes to the next member for the following meeting.

### 3. MVP definition

- **Define the MVP early** and **reach agreement with the client** — likely at the next client meeting.
- The MVP should be **small but complete**, focused on the **core workflow first**.
- Separate **must-have from nice-to-have** features, and **functional from non-functional** requirements.
- **Warning from prior years:** do not treat the ideal final product as the minimum semester deliverable. Students who focused on non-functional concerns (e.g. performance) at the expense of functional requirements scored poorly.

### 4. Requirement quality

- Requirements must be **specific and actionable**.
- Avoid vague statements such as *"the system should be user-friendly"* — these are unmeasurable.

### 5. Team roles and shared understanding

- The group reported that role allocation has started; some members have chosen roles, and **one more discussion is needed to finalise**.
- Fudong: it is early, but settle this **as soon as possible**.
- Not everyone is strong at both technical work and documentation — **that is fine**, but **every member must maintain an overall understanding of the project**, not only their own part.

### 6. Timeline and visible progress

- **Set the timeline early and keep it realistic.**
- **Do not spend too long only discussing ideas** — produce something visible as early as possible. A runnable demo or a Figma prototype both count.
- The group confirmed a **prototype already exists** and will be shown to the client. Fudong endorsed this and asked the group to **seek feedback on it**, as this surfaces misunderstandings early.

### 7. Raising problems

- **Raise problems early.** If something is unclear, difficult, or not working, say so immediately — do not leave it to the last minute of semester.
- Prior-year example given: students who left issues (including team conflict) until the end of semester could not be helped at that point.

### 8. Documentation and evidence

- **CC Fudong on client communications** — this serves as evidence.
- **Document any requirement changes.**
- **Share documentation in the Teams channel** so the facilitator can review it.

### 9. Contact and professionalism

- Contact Fudong via the **Teams channel, email, or private message** for a one-to-one. *"My door is always open."*
- **Maintain professionalism throughout**: reply to messages promptly, respect the client's and teammates' time, and follow through on agreed tasks.
- Fudong expects a documented **agreement on task allocation**.

### 10. Meeting cadence and in-person meetings

- Facilitator meetings are **fortnightly, not weekly**.
- **Next facilitator meeting: Tuesday 18 August.** Hans to set up a recurring placeholder in the calendar (can be adjusted later).
- **In-person meetings:** Tyrone asked whether at least one meeting could be held in person. Fudong works full time as a software engineer and the round trip to campus costs him roughly two hours, so online is strongly preferred — but **one in-person meeting can be arranged if the group genuinely needs it**. To be discussed further at the 18 August meeting.

### 11. Facilitator Meeting #1 — action items

| # | Action | Owner | Due |
|---|---|---|---|
| F1 | Write and circulate minutes for this meeting; rotate note-taker for the next | Hans → next member | This week |
| F2 | Ask client to provide dummy / sample data | Group | Tue 11 Aug meeting |
| F3 | Agree the MVP with the client; document must-have vs nice-to-have and functional vs non-functional requirements | Group | Next client meeting |
| F4 | Finalise team role and task allocation, and document the agreement | All | ASAP |
| F5 | Produce project timeline / Gantt chart | Group | Before Scope of Work submission |
| F6 | CC Fudong on all client correspondence; share documentation in the Teams channel | All | Ongoing |
| F7 | Schedule fortnightly facilitator meeting placeholder | Hans | Before Tue 18 Aug |
| F8 | Send draft documentation to Fudong for feedback before submission | Group | Ongoing |
| F9 | Revisit whether an in-person facilitator meeting is needed | Group / Fudong | Tue 18 Aug |

---

## Consolidated open questions and risks

| # | Open question / risk | Raised by | Where it gets resolved |
|---|---|---|---|
| 1 | **No data exists yet.** Dr Boeing does not have the dataset; BHP / Rio Tinto / RCT approaches may take time, and he expects perhaps two of three to deliver. | Dr Boeing | Sample + generic data promised; chase at Tue 11 Aug meeting |
| 2 | **Data will arrive at wildly varying depth** — BHP may give only "mine name, operator, Caterpillar, thirty trucks", while the model wants detail down to sensors. | Dr Boeing | Data model must tolerate sparse records — design decision, not a blocker |
| 3 | **Verification process is undefined.** Dr Boeing: *"I haven't figured out the verification processes."* | Group / Dr Boeing | Team to propose; AI bot is a stretch, not a commitment |
| 4 | **Ownership is many-to-many and messy** — five-plus companies per site, JVs, subsidiaries, contractors. Naive hierarchical model will fail. | Dr Boeing | Reflect in ER diagram (C2) before building |
| 5 | **Machine-type list is open-ended**, especially underground. No authoritative list yet. | Dr Boeing | Dr Boeing to supply a list; team to research in the meantime |
| 6 | **Scope tension:** the written brief says *autonomous* equipment, but Dr Boeing repeatedly described **teleremote** machines (RCT's main product) as in scope. Teleremote is not autonomy. | — | Confirm with Dr Boeing / RCT — Tue 11 Aug |
| 7 | **How deep does technology detail go?** Sensor-level data is wanted but conceded as possibly out of reach. Risks scope creep. | Dr Boeing | MVP boundary — must-have vs nice-to-have |
| 8 | **Data coverage is uneven** — good market data for autonomous haul trucks, much less for other machine types. | Dr Boeing | May constrain what the dataset can realistically cover by November |
| 9 | **MVP boundary not yet agreed with client.** The "three parts" framing (map / dashboard / export) is the best anchor so far. | Fudong | Next client meeting; needed for the report |
| 10 | Scope of Work + Gantt chart not yet drafted. | — | Draft, send to Dr Boeing and Fudong early for feedback |
| 11 | Team role allocation not finalised. | Fudong | One further group discussion, ASAP |
| 12 | Client response latency (email checked every 1–2 days) may block progress. | Dr Boeing | Mitigated by agreed email → Teams follow-up protocol |
| 13 | A second UWA group is working on the same topic — risk of confusion in client correspondence. | Dr Boeing | Always identify the group clearly in all correspondence |
| 14 | **No inclusion threshold defined** — what qualifies a machine as autonomous/teleremote enough to appear in the dataset. Reference sites solve this with an explicit rule. | — | Agree with Dr Boeing / RCT — Tue 11 Aug |
| 15 | Remaining reference links (market report, haul-truck chart) not yet sent through; the two map links are confirmed. | — | Reminder to Dr Boeing (C6) |
| 16 | Several names and figures garbled by automatic transcription (contractor company, Olive Downs percentages). | — | Confirm with Dr Boeing before the minutes are relied on |

---

## Next meetings

| Date | Meeting | Format |
|---|---|---|
| **Tue 11 August 2026, 10:00** | Requirements meeting with RCT Global (Yash) + Dr Boeing + second UWA group | Online |
| **Tue 18 August 2026** | Facilitator Meeting #2 — Fudong Qin | Online (placeholder to be created) |

---

*Minutes compiled from the recorded transcripts of both meetings. Drafted with assistance from Claude (Anthropic) — to be acknowledged in the report's AI use section.*
