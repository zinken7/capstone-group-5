# Administrator guide

Administrators decide which community submissions become public. Nothing a
contributor submits or corrects appears on the Map, Equipment Register or
Analytics until an administrator approves it.

The administration pages are at `/admin` (for example
https://capstone-group-5.vercel.app/admin). They are not linked from the public
navigation.

## Accounts

Accounts are created from the command line; see
[`backend/README.md`](../backend/README.md#administrator-accounts) and, for
staging, [`staging.md`](staging.md#administrator-accounts). A new account gets a
temporary password, shown once, which must be changed at first sign-in. Until
then, only the password page is available.

Sessions last 8 hours. Changing your password signs you out everywhere else, and
a deactivated account is signed out immediately.

## Reviewing a submission

1. **Review queue** lists records pending review, oldest first: new submissions
   and corrected records. Missing evidence or a missing technology product is
   flagged.
2. Open a record with **Review**. Check the details and open each evidence link;
   links open in a new tab.
3. If something is wrong or missing, use **Correct this record**. You can change
   the quantity, mining environment, deployment status, automation level,
   installation type, commissioning date or year, and the technology supplier
   and product, and add an evidence URL. Corrections are saved in the revision
   history with the previous values and do not change the verification status.
4. Record a **Decision**:

| Decision | Result |
|---|---|
| Approve | The record is verified and appears in public views. It needs a technology product and at least one evidence URL. |
| Needs changes | The record leaves the queue and stays out of public views. A contributor correction returns it to the queue. A note is required. |
| Reject | The record stays out of public views for good. A note is required. |

Decisions apply only to records pending review. Each one is kept, with your
email, the note and the time, in the record's history, together with every
correction and the contributor's original submission.
