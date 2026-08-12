# Risk, Skills and Technology Assessment

<!-- ============================================================
     OWNER: Tyrone.          PAGE TARGET: ~1.75 pages.
     ============================================================

     WHAT "EXCEPTIONAL" REQUIRES (from the rubric), all four needed:
       1. A realistic assessment of the team's skills, resources and risks.
       2. Skills gaps identified AND ADDRESSED — every gap needs an action,
          not just a mention.
       3. Different technology choices CONSIDERED and the decisions
          JUSTIFIED — show the alternatives you rejected, not just the stack
          you picked.
       4. Relevant risks INCLUDING CYBERSECURITY identified and planned for.

     WHERE TO PULL FROM — most of this already exists in the SRS [7]:
       Skills          — not in the SRS. Team's own honest assessment.
                         A-07 (Chinese-language sources) is one known
                         dependency worth a row.
       Resources       — C-04 (team hours, semester calendar),
                         C-01 (UWA hosting), C-05 (seed data).
       Technology      — Sec. 2.6 (automation classification: ISO 17757 vs
                         GMG vs vendor vocabulary, with the reasoning),
                         Sec. 3.3 (base map, identity, external services),
                         Sec. 7 (AAF costs and why it was excluded).
                         The application stack is NOT yet decided — C-03 says
                         it is our choice, but Q-4 / App. A.1 means the UWA
                         environment is unknown. Say so rather than inventing
                         a decision.
       Risks           — Sec. 8 assumptions A-01 to A-07 map almost one-to-one
                         onto risk rows. Add C-05 (no seed data) and C-04
                         (capacity). Q-14 (competing suppliers) is a real one.
       Cybersecurity   — Sec. 6.2, NFR-03 to NFR-07. Threat profile follows
                         from FR-43: records publish immediately on an
                         unauthenticated submission.

     CITATIONS: IEEE, numbered in order of first appearance across the whole
     report — see 05-references-and-ai-use.md. Cite SRS sections as
     [7, Sec. 2.6] or [7, App. A]. Requirement identifiers (FR-nn, NFR-nn,
     C-nn, A-nn, Q-nn) stay bare; they are defined in [7].

     LAYOUT: keep table cells SHORT — long cells cost pages fast. The dashes
     in each table's separator row set the column widths; don't flatten them
     back to |---|---|.
     ============================================================ -->

## Team Skills and Resources Assessment

| Skill required | Capability | Gap | Action |
|:-------------------------|:------------|:------------|:----------------------|
| | | | |
| | | | |
| | | | |
| | | | |

<!-- One paragraph on resources: team hours across the semester (C-04), the
     UWA hosting environment (C-01), and seed data from the client and
     representative users (C-05). -->

## Technology Assessment

<!-- One row per decision. The "Options considered" column is what earns the
     mark — a chosen stack with no alternatives shown reads as "stated" rather
     than "justified". Include the deferred stack decision as a row; a
     documented, reasoned deferral scores better than a guess. -->

| Decision | Options considered | Chosen | Justification |
|:-----------|:-----------------|:------------|:-----------------------------------|
| | | | |
| | | | |
| | | | |
| | | | |

## Risk Register

Likelihood (L) and impact (I) rated High, Medium or Low.

<!-- Aim for 8–10 rows. Cover at least these categories: Data, Technical,
     Client / scope, Cyber, Resource. Every row needs an owner. -->

| # | Risk | Category | L | I | Mitigation | Owner |
|:--|:-----------------------------|:--------|:-:|:-:|:--------------------------|:------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |

## Cybersecurity Considerations

<!-- Named explicitly in the rubric, so it gets its own heading. Start from
     why this system's threat profile is what it is: it accepts
     unauthenticated public input and republishes it immediately (FR-43), so
     the submission path is the primary attack surface.

     Then cover, briefly — the requirements are already written in
     [7, Sec. 6.2]:
       - Submission path: spam challenge (FR-52), output escaping (NFR-04),
         parameterised queries (NFR-05), verification status defaulting
         public views to reviewed records (FR-44).
       - Request forgery: per-session anti-forgery token (NFR-03).
       - Access control: authentication on all administration (NFR-06).
       - Transport: HTTPS throughout [7, Sec. 3.4].
       - Privacy: minimal contributor data, stated use (NFR-09); CC licence
         means contributions are public (C-02).
       - Repository hygiene: public repo, so secrets by environment
         configuration only (NFR-07). -->
