# Client Communication and MVP Agreement

<!-- Owner: TBC. Page target: 1 page. Drafted from SRS v0.2 §1.4, revision
     history and Appendix A. THE APPROVAL STATUS BELOW MUST BE UPDATED BEFORE
     SUBMISSION. -->

## Communication Plan

| Stakeholder | Channel | Frequency | Owner |
|:--------------------------|:--------------------|:------------|:------|
| Client — Dr Adrian Boeing | MS Teams, scheduled meetings | [CONFIRM] | |
| Representative users — RCT Global, Epiroc | Joint meetings with the client | As arranged | |
| Facilitator — Fudong Qin | MS Teams, scheduled meetings | [CONFIRM] | |
| Team | MS Teams, GitHub pull requests | [CONFIRM] | All |

Minutes and transcripts of every meeting are recorded at
`docs/meeting-notes/` and are accessible to the client and facilitator.

## Meeting and Contact Log

| Source | Date | Attendees | Key outcomes |
|:-----|:--------|:------------------|:--------------------------------------------|
| [2] | 6 Aug 2026 | Client, Group 5 | Confirmed the problem, the absence of any open dataset, the crowdsourcing and verification model, and the core record structure |
| [8] | 7 Aug 2026 | Facilitator, Group 5 | Delivery bounded by the Semester 2 calendar and available team hours (C-04) |
| [1] | 11 Aug 2026 | Client, Yash Singh (RCT Global), Milan Ivovic (Epiroc), Groups 5 and 15 | Teleremote confirmed in scope and three automation bands set; analytics measures established; primary market analysis use case identified |

## Requirements Documentation

Communication with the client has been captured as a Software Requirements
Specification rather than held informally. Version 0.1 was drafted from [2],
[8] and the written brief; version 0.2, issued 11 August 2026, incorporates [1]
and internal review.

Every requirement carries a source reference and a status distinguishing what
the client has stated (*confirmed*) from what the team has inferred
(*assumed*), with each assumed requirement mapped to a numbered open question
in [7, App. A]. This prevents our assumptions being mistaken for the
client's agreement.

## MVP Agreement

The MVP itself is specified in Section 1.6; this section records the client's
agreement to it. [7, App. B] is a scope confirmation checklist listing every
Must, Should and Could item for the client to accept or amend, together with a ranking of the
four functions should delivery need to be reduced. It was issued with the SRS [7]
on 11 August 2026.

<!-- REPLACE once the client responds. If Appendix B is signed before
     submission, state it plainly:
       **MVP approved by:** Dr Adrian Boeing, [date], via [channel].
     If not signed, keep the sentence below — documented pursuit of approval
     scores better than an unsupported claim of agreement. -->

**Status:** the MVP scope was presented to the client and representative users
at [1] and the three automation bands were confirmed in that meeting (Q-1,
closed). Formal confirmation of the full Must set, recorded in Appendix B, is
[CONFIRM: outstanding / received DATE].

## Outcomes from Client Communication

Communication has changed the specification, not merely confirmed it.

- **Equipment scope settled.** Teleremote equipment was confirmed in scope as
  one of three automation bands [1], closing a question that had blocked the
  data model.
- **Classification refined.** The analysis both representative users described
  requires separating line-of-sight remote from semi-autonomous operation, so
  we proposed recording four vendor tiers and presenting three — four roll up
  to three, but three cannot later be split into four ([7, Sec. 2.6]).
- **Analytics scope defined.** The specific measures required were established
  in [1] rather than assumed.
- **Two features excluded on the client's account.** Forecasting was excluded
  as economic analysis rather than software, and access control by internal
  role was judged unnecessary [1].
- **Sixteen open questions raised** for confirmation, including dataset and
  source licensing, the minimum publishable field set, and whether the product
  is public or a supplier's internal dashboard ([7, App. A]).
