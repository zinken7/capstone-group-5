<!-- Owner: Hans. Page target: 5 pages, numbered 1 to 5 (the title page, contents and
     front matter are on roman pages before this).
     LINKS MUST BE FULL URLs. Issue and PR numbers resolve via the note in
     00-front-matter-final.md. -->

\clearpage
\pagenumbering{arabic}

# Requirements and solution

We built an open, crowdsourced and queryable map of autonomous and teleremote mining equipment. All 15 must-have items in the MVP agreed on 8 October are on the staging site, apart from the optional contributor email on the submission form (Section 4). Twelve were working on 8 October, and the other three were closed by 15 October: operational deployments shown by default (#172, PR #180), the required submission fields (#171, PRs #188 and #193), and the four automation levels in the client's wording (#157, PR #186). The rest of #157 was withdrawn in SRS version 0.6: the client rejected deriving a level from the technology product, and the form's help text needs no requirement.

**The need.** Deployment data is sold in market reports at about $50,000–100,000 each, and each report is a single source that nobody can check (client meeting, 6 August \[5\]). No open dataset exists, so startups, analysts and researchers are locked out.

**Requirements.** The written brief names four functions: an interactive map, an analytics dashboard, a queryable register, and verified crowdsourcing. We turned three client meetings and two industry users' input into a specification, now at version 0.6, with version 0.7 in review (PR #210) \[1\], following our project plan \[3\]. Every requirement records its source, and anything the team proposed without a source is marked as such. The client received an MVP scope agreement on 8 October, and a revision matching the build to sign on 16 October \[2\]. **\[UPDATE once signed.\]**

**Solution.** The system is written in TypeScript: a React front end with a Leaflet map, and a Node API using Drizzle ORM over PostgreSQL with PostGIS. Staging runs on Vercel and redeploys from the main branch. Public pages show verified records only; a record needs at least one evidence link before it can be verified, and nothing is published until an administrator approves it.

| Function | Delivered on staging (15 Oct) | Notes |
| ---- | -------------- | ------ |
| Map | One marker per site with detail (FR-15, FR-17); operational deployments by default (FR-16); supplier filter (FR-18); year control (FR-19); new sites appear after approval (FR-04) | FR-16 completed on 13 October (#172) |
| Analytics | Headline counts, machines in service over time, counts by country and machine type, market share (FR-21–26); one filter set for every chart, aggregates only (FR-27, FR-28) | — |
| Equipment register | Search, filter and sort (FR-36); export to CSV (FR-37) | — |
| Contribute and review | Public form with no account (FR-40) and the required fields (FR-07, FR-08); nothing public until approved (FR-42); four automation levels (FR-57); evidence links (FR-44); approve, reject and correct, with a duplicate warning for reviewers (FR-45, FR-46, PR #192); submission history for administrators (PR #191) | "Request changes" is held back until contributors can answer it (PR #212); see Section 4 |
| All pages | Accessibility to WCAG 2.1 AA (NFR-01) | — |
| Optional: evidence check (FR-55) | Separate module that checks a submission against its evidence link | Connection to the review screen, awaiting the client's decision |

Beyond the MVP, staging also has extra map filters (country, machine type, automation level) and a breakdown of machines by automation level. **\[CONFIRM the full list of Should items delivered.\]**

# Verification and testing

Every change passed automated tests in CI and a review by another member before it reached main, and then ran on staging before the client saw it.

| Activity | What it checks | Evidence |
| ---- | -------------- | ----- |
| Automated tests in CI | Every pull request runs the test suite, and our definition of done requires it to pass before merge. On the current main, the backend suite has 350 tests in 35 files and the frontend suite 200 tests in 26 files; run `npm test` in `backend/` or `frontend/`. **\[UPDATE the counts after PR #212 merges.\]** | [ci.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/ci.md) |
| Schema check in CI | The build fails if the code and the database schema drift apart, after the data layer moved to Drizzle ORM. The move itself caught two bugs. | PR #102 |
| Code review | No pull request merges without review. Reviewers reproduce problems before reporting them: a reported data leak was reproduced locally first and fixed before merge. | PR #173 |
| Manual QA | Each page checked against a written checklist on staging, by a member other than its author. | [QA checklist](https://github.com/zinken7/capstone-group-5/blob/main/docs/sprint-2-frontend-qa-checklist.md) |
| Accessibility | Automated end-to-end accessibility tests, plus manual checks of contrast, colour-independent meaning, keyboard use and labelled forms, to WCAG 2.1 AA. | [accessibility.spec.ts](https://github.com/zinken7/capstone-group-5/blob/main/frontend/e2e/accessibility.spec.ts), PR #169 |
| Workflow and security testing | The whole contribution and review workflow was tested on staging, not only single pages. This found that the public correction route accepted edits to unverified records from anyone, without signing in: an anonymous request reopened and changed a rejected test record. The route now refuses such edits (403), tests check that nothing is stored, and the fix was checked before and after. | #211, PR #212 |
| Client review | Reviewed at client meetings; MVP scope agreement sent on 8 October, revision to sign on 16 October. | [Meeting minutes](https://github.com/zinken7/capstone-group-5/tree/main/docs/meeting_minutes) **\[UPDATE once signed\]** |

**Evidence-check engine (FR-55).** The engine, designed in \[4\], has 255 automated tests. Before any tuning, Hans labelled a set of 20 cases containing 110 facts. The free local check judged 105 of the 110 correctly, and adding Claude Haiku for the uncertain cases raised that to 110. A second member then wrote harder cases. The first five found three ways to fool the engine: planned deployments read as current, fleets credited to the wrong site, and confused company relationships. The remaining cases stay hidden from the engine's author until those fixes are made.

# User guides and deployment

The README sets out how to install, run and test the system, and each user role has its own guide.

| Document | For | What it covers | Link |
| ---- | ---- | -------- | ------- |
| README | Developers, markers | Requirements, downloading the code, starting the backend, database and frontend, creating an administrator, environment variables, troubleshooting | [README](https://github.com/zinken7/capstone-group-5#readme); tested by following it on a clean Ubuntu VM, macOS and Windows (#189, PR #190) |
| Administrator guide | Reviewers | Signing in, reviewing the queue, approving, rejecting and correcting a record | [admin-guide.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/admin-guide.md) |
| User guide | Public users and contributors | Using the map, analytics and register; submitting a record with evidence | **\[MISSING: no user guide in docs yet\]** |
| Deployment and CI | Whoever hosts it next | How staging deploys from main, database migrations, CI checks | [staging.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/staging.md), [ci.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/ci.md) |
| API reference | Developers | Endpoints and their parameters | [api/README.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/api/README.md) |
| Data model and architecture | Developers | Entity-relationship diagram, architecture diagram | [ERD](https://github.com/zinken7/capstone-group-5/blob/main/docs/database/ERD.md), [architecture](https://github.com/zinken7/capstone-group-5/blob/main/docs/images/mvp_architecture.pdf) |
| Team conventions | Developers | Branches, commits, issue and pull request templates | [CONTRIBUTING.md](https://github.com/zinken7/capstone-group-5/blob/main/CONTRIBUTING.md) |

**Staging:** [capstone-group-5.vercel.app](https://capstone-group-5.vercel.app/). The demonstration data is placeholder data, not the client's records. Administrator credentials are given to the client separately and are not in this report.

**Licences:** the repository is licensed MIT for the source code and CC BY 4.0 for the dataset, as proposed to the client. **\[CONFIRM: client's agreement.\]**

# Discussion and future work

All must-have items in the agreed MVP are delivered, and the remaining gaps are recorded as open issues rather than left undocumented. Before submission we also fixed #156, where a deployment decommissioned in the app stayed on the default map (PRs #166 and #187), and #168, where duplicate submissions were accepted without a warning (PR #192).

**Open issues at submission** ([issue list](https://github.com/zinken7/capstone-group-5/issues)):

- \#203 to \#209, with SRS version 0.7 (PR #210): closing the review loop. Requesting changes only works if the contributor can answer, and contributors have no account. Version 0.7 proposes a private submission key so contributors can follow and update their own submissions, and asks the client to confirm the loop (Q-23); the team is still agreeing whether the key is a Must for this semester. Until then, "request changes" is held back (PR #212): an administrator corrects and approves a record, or rejects it with a note.
- Optional contributor email: FR-40 lets a contributor leave an email so an administrator can follow up. The correction form collects one; the submission form does not yet.
- \#83 and \#69: the evidence check works as a separate module but is not yet connected to the review screen. Connecting it needs the client's decision, a rebase onto main, a guard on outbound requests, and a background worker, which the current serverless host cannot run.
- Abuse protection: the public forms have no rate limiting, so a script could flood the review queue. **\[CHECK: whether the FR-51 submission challenge is built.\]**

**What worked.** Tracing every requirement to its source kept scope discussions short: when a feature was questioned, the source settled it. Delivering one complete slice per sprint meant there was always something to show the client.

**What we would change.** We tested the review workflow end to end late. Done earlier, it would have found the anonymous-edit flaw sooner: a unit test had asserted that behaviour as correct, because the specification did not yet say who may change a record before it is verified. Staging redeploys only from merges made by one member's account, so that member became a bottleneck for every release. Hosting at UWA was never confirmed, so the system is handed over on a public host with deployment instructions.

**Future work:**

1. Close the review loop: collect the optional email on the submission form, with an "Email contributor" link for administrators, then add the private submission key so contributors can follow and update their own submissions (#204 to #209).
2. Add rate limiting and an automated-submission challenge (FR-51) to the public forms.
3. Connect the evidence check to the review screen, if the client agrees, and fix its three known weaknesses (planned deployments, wrong site, company relationships).
4. Extend it to use source publication dates, detect page language, and learn from reviewers' decisions.
5. Replace the placeholder data with real records from industry contributors.
6. Move hosting to a UWA environment and confirm the licences.
7. Deliver the remaining Should and Could items, such as a satellite-view link for reviewers.

# Use of generative AI

We used generative AI in documents, code and review, under two team rules.

- **No client data in AI tools.** The client's dataset was never given to an AI tool, and API keys stayed in local environment files.
- **A person reviews every merge.** AI output goes through the same review and tests as any other change.

**AI inside the product.** The evidence check uses a small local language model, and calls Claude Haiku only when the local model is unsure. The model may only point to a sentence number in the source, never write a quote, and the code then checks that the sentence exists. The engine recommends; it never changes a record's status, and an administrator makes every decision.

| Member | Where AI was used | How the output was checked and changed |
| -- | -------- | ---------- |
| Hans Lionar | Claude, for drafting and editing the specification and client documents; Claude Code, for writing the evidence-check engine and the Drizzle migration to his design, for auditing the review workflow, and for first-pass review of teammates' pull requests. Commits the agent wrote for the engine and the migration carry a co-author line naming it. | Design written first, then code checked against tests (255 for the engine) and live on staging. Findings were reproduced before being acted on: a data leak was confirmed locally and fixed (PR #173); a suggested map bug could not be reproduced and was dropped from the review (PR #179); an audit's report that anyone could edit unverified records was reproduced on staging, where a rejected record was reopened, before the fix, and the fix was confirmed to refuse the same request (#211, PR #212). |
| Tyrone Tran | **\[ADD: tool, and what you used it for\]** | **\[ADD: how you checked it, and one output you changed or rejected\]** |
| Zerun Zhang | Claude Code, to help probe the backend for concurrency, injection and data-exposure problems. For concurrency, it drafted and ran a test that forces two corrections onto the same record at once. For injection, it checked that queries are parameterised and that the sort allow-list, search wildcard escaping and CSV formula protection work, with tests covering each. For vulnerabilities, it reproduced an unreviewed submission moving a site on the public map (PR #173) and a stale admin session after reactivation (PR #105). | For the concurrency test, the assistant checked that it fails when the row lock is removed, and I reviewed the result. I reviewed both reproductions before reporting them on those pull requests. I chose which features and pull requests to test, read every finding before acting on it, and only raised issues whose reproduction I had checked. Changed: every fix was undone once to confirm its tests fail, and any test that still passed was rewritten; in PR #166 a drafted test assumed a site had a commissioning year, and I had its expectation corrected after it failed. Rejected: the assistant once merged main into my branch after I had declined it; I had the merge removed before anything was pushed and set a rule against it. |
| Zunhao Zhang | **\[ADD: tool, and what you used it for\]** | **\[ADD: how you checked it, and one output you changed or rejected\]** |
| Shee Wang | **\[ADD: tool, and what you used it for\]** | **\[ADD: how you checked it, and one output you changed or rejected\]** |
| Hengan Weng | **\[ADD: tool, and what you used it for\]** | **\[ADD: how you checked it, and one output you changed or rejected\]** |

**\[NOTE FOR TEAM, delete before submission\]** The top band of the AI criterion asks for evidence that AI output was critically evaluated and adapted. Each row needs one concrete case, such as a suggestion you tested and fixed, or one you rejected and why. “Used ChatGPT for code” alone scores Competent at best. PR #147 came from a `codex/` branch, so its author should list Codex.

# References

1. Group 5, *Software Requirements Specification*, version 0.6, October 2026; version 0.7 in review (PR #210). [docs/SRS/SRS.md](https://github.com/zinken7/capstone-group-5/blob/main/docs/SRS/SRS.md)
2. Group 5, *MVP Scope Agreement*, sent to the client on 8 October 2026 and revised on 16 October 2026. [Correspondence log](https://github.com/zinken7/capstone-group-5/blob/main/docs/correspondence-log.md)
3. Group 5, *Project Plan and Specification Report* (Assignment 1), 25 August 2026. [PDF](https://github.com/zinken7/capstone-group-5/blob/main/docs/d1/submitted/2026-08-25-group5-assignment-1.pdf)
4. Group 5, *FR-55 Automated Evidence Check: Design*, pull request #84. [Link](https://github.com/zinken7/capstone-group-5/pull/84)
5. Client and facilitator meeting minutes, 6 August to 29 September 2026. [docs/meeting\_minutes](https://github.com/zinken7/capstone-group-5/tree/main/docs/meeting_minutes)
