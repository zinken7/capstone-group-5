# Facilitator Meeting 5

- **Project:** Autonomous Mining Equipment Market Map
- **Minutes by:** Tyrone Tran (24814799)

| | |
|---|---|
| **Date** | Tuesday 29 September 2026 |
| **Format** | Online (MS Teams) |
| **Duration** | Approximately 21 minutes with facilitator |
| **Facilitator** | Fudong Qin (UWA) |
| **Group attendees** | Hengan Weng (24201874), Shee Wang (24368932), Zerun Zhang (24389925), Hans Lionar (24661999), Zunhao Zhang (24758673), Tyrone Tran (24814799) |
| **Purpose** | Fortnightly check-in: project progress, client-data integration, data validation, testing and upcoming demonstration |
| **Reference code** | FM5 |

**Record coverage.** These minutes were prepared from the MS Teams transcript. The facilitator meeting ended at approximately 21:18 in the recording. The internal team discussion that continued after the facilitator left is not included here.

---

## 1. Project progress and client-data integration

- The team reported that the client had reviewed the project direction, agreed with the database approach, and provided an anonymised dataset for use in development.
- The backend and database are now connected, and a staging environment has been deployed so the team can run and demonstrate the system online as well as locally.
- The client dataset does not map cleanly to the current schema. The team identified missing or inconsistent fields, duplicate rows and differences between the current ERD and the client-provided data.
- The team will adapt the data model where necessary so that client-required fields can be represented rather than forcing the client data into an incompatible structure.

## 2. Missing data, dummy data and validation

- The facilitator agreed that generated dummy data can be used where the client dataset does not provide enough data for development or demonstration.
- The facilitator recommended also generating deliberately invalid test data, such as missing required fields or incorrect data types, to test how the frontend and backend handle bad inputs.
- Invalidly formatted data should not be processed. The system should fail gracefully and provide a clear, user-friendly message explaining that the data cannot be accepted.
- Where important information is missing from the client dataset, the team should continue communicating the issue to the client. If sufficient data is otherwise available, incomplete records may be ignored during cleaning; dummy data may be used where needed for development.

## 3. Testing and API contract

- The team discussed unit and integration testing as the immediate testing priorities, with integration and system testing particularly important for validating the end-to-end flow between frontend, backend and database.
- The facilitator recommended maintaining a clear **API contract** so frontend, backend and QA work against the same interface.
- The team confirmed that API-contract work is already being tracked in the project backlog.

## 4. Demonstration and facilitator availability

- The team plans to use the online staging environment for an upcoming product demonstration.
- The facilitator said he is unlikely to be available to attend the presentation directly.
- A recording of the presentation can be shared with the facilitator for review.

## 5. Action items

| # | Action | Owner | Due |
|---|---|---|---|
| F24 | Reconcile the database/data model with the fields required by the client dataset | Database/backend team | Current Sprint |
| F25 | Prepare representative dummy data where client data is insufficient, including deliberately invalid cases for validation testing | Database/QA team | Before integration testing |
| F26 | Reject malformed data gracefully and provide clear user-facing validation feedback | Frontend/backend team | Before final integration |
| F27 | Continue communicating missing critical data fields to the client and retain evidence of the communication | All members | Ongoing |
| F28 | Maintain and test against a shared API contract across frontend, backend and QA | Backend/QA team | Current Sprint |
| F29 | Record the upcoming product demonstration and share it with the facilitator if required | Team | At next demonstration |

## 6. Next meeting

The facilitator indicated that the next check-in would likely be in approximately two weeks.
