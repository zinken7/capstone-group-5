# Facilitator Meeting 2

- **Project:** Autonomous Mining Equipment Market Map
- **Minutes by:** Hengan Weng (24201874)

| | |
|---|---|
| **Date** | Tuesday 18 August 2026 |
| **Format** | Online (MS Teams), recorded and transcribed |
| **Duration** | Not recorded in full |
| **Facilitator** | Fudong Qin (UWA) |
| **Group attendees** | Tyrone Tran (24814799); Hans Lionar (24661999); Zhang Zerun (24389925); Zunhao Zhang (24758673); Wang Shee (24368932); Hengan Weng (24201874) |
| **Purpose** | Fortnightly facilitator check-in: progress, client contact, technology decisions |
| **Reference code** | FM2 |

**Transcript coverage.** The recording captures only the closing three minutes
of the meeting. The progress discussion that preceded it is recorded here from
the participants' recollection and is marked as such.

---

## 1. Progress and client contact

*Recorded from participants' recollection; not covered by the transcript.*

- The facilitator asked for a progress update.
- The team reported that its proposal had been sent to the client as the
  requirements specification and the interactive prototype, and that no reply
  had been received. Two follow-ups had been sent, on 12 and 14 August.
- **Fudong's guidance:** keep trying to reach the client and settle the MVP as
  early as possible. Closing the meeting, he repeated that the team should try
  to get in touch with the client as soon as possible.

The team stated that its focus for the week is obtaining the client's
confirmation, since that is the basis for the Group Assignment 1 report due the
following Tuesday.

## 2. Changing the technology stack after this deliverable

Tyrone Tran asked whether the technology stack and libraries chosen now can be
changed later if an unforeseen reason requires it.

**Context given.** The backend is currently Node.js with Express, chosen
because the member responsible for backend work is experienced in Node.js. The
concern is the later LLM and retrieval-augmented generation (RAG) work: if
integration proves difficult in Node.js, Python may be the better host. That
capability is not in the MVP, so the question cannot be settled now.

**Fudong's answer.**

- He did not recommend changing a technology choice because changing a
  technical specification could require significant rework.
- If the team does change it, the change must be documented: **the reason for
  it and the trade-off accepted**, written up in the final report.
- Given that the LLM capability sits outside the MVP and the decision cannot
  reasonably be taken yet, he considered the team's position reasonable and
  confirmed that the stack may be changed later if necessary.

**Decision recorded.** The technology stack presented in this deliverable is
not frozen. It may be revised if a later requirement makes the current choice
unsuitable, provided the reason and the trade-off are documented in the final
report.

## 3. Next meeting

The facilitator confirmed that the next check-in would be in approximately two
weeks. The exact date is to be confirmed.

---

## Action items

| # | Action | Owner | Due |
|---|---|---|---|
| F10 | Continue pursuing the client's confirmation of the MVP scope; escalate if no response | M2 | Ongoing, before the report is submitted |
| F11 | If the backend stack changes, record the reason and the trade-off accepted | M1 | Final report |
| F12 | Confirm the date of Facilitator Meeting 3, noting the study break from 1–7 September | M2 | To be confirmed |

## Open questions and risks arising

| # | Open question / risk | Where it gets resolved |
|---|---|---|
| 1 | Client confirmation of the MVP scope is still outstanding, and the report depends on it. | Escalation continues; the report states what is settled and what is proposed |
| 2 | The backend host may need to change for the LLM and RAG work, which is outside the MVP. | Deferred; decision taken when that work is scheduled, documented per F11 |

---

*Minutes compiled from the recorded transcript and the participants'
recollection of the portion not captured. Drafted with assistance from Claude
(Anthropic), and acknowledged in the report's AI use section.*
