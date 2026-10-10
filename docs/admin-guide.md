# Administrator guide

Administrators decide which community submissions become public. Nothing a
contributor submits or corrects appears on the Map, Equipment Register or
Analytics until an administrator approves it.

The administration pages are at `/admin` (for example
https://capstone-group-5.vercel.app/admin). Every public page links there from
the **Administrator sign-in** link in the footer; the main navigation does not.
Following the link opens the review queue when you are signed in, and the
sign-in page otherwise.

## Accounts

A root administrator adds and removes administrators on the **Administrators**
page (`/admin/users`), which only root administrators see:

- **Add an administrator** with their email. The page shows a temporary password
  once; send it privately. It must be changed at first sign-in.
- **Deactivate** an administrator to remove their access; they are signed out at
  once. **Reactivate** restores it. Accounts are never deleted, because the
  review history refers to them.

Root accounts cannot be created or changed on that page. They, and the first
account, are created from the command line; see
[`backend/README.md`](../backend/README.md#administrator-accounts) and, for
staging, [`staging.md`](staging.md#administrator-accounts). A new account gets a
temporary password, shown once, which must be changed at first sign-in. Until
then, only the password page is available.

Sessions last 8 hours. Changing your password signs you out everywhere else, and
a deactivated account is signed out immediately.

## Reviewing a submission

1. **Review queue** lists everything waiting for a decision, oldest first. A
   **Submission** is a new record, or one a contributor corrected after it was
   sent back. A **Correction** is a change a contributor proposed for a verified
   record; the queue shows which fields it changes. Missing evidence or a missing
   technology product is flagged.
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

## Reviewing a proposed correction

A verified record stays public with its current values while a correction to it
waits. Its page shows each **Proposed correction**: every changed field with its
value before and the proposed value, the contributor's note and any sources they
supplied. If the record has changed since the correction was sent, the field is
flagged with its value now; approving applies the proposed value over it.

| Decision | Result |
|---|---|
| Approve | The change is applied and appears in public views straight away. The record stays verified. The history shows the change, credited to the contributor, with the previous values. |
| Needs changes | The record stays as it is. The contributor can send a new correction. A note is required. |
| Reject | The record stays as it is. A note is required. |

Decided corrections stay in the record's history, including what was proposed.
