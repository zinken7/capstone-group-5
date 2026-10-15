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
| Approve | The record is verified and appears in public views. It needs at least one evidence URL and site coordinates. |
| Needs changes | The record leaves the queue with the status **Changes requested** and waits for its contributor. A note is required, and the contributor sees it under **My contributions** on the Contribute page, in the browser they submitted from. When they update the record, it returns to the queue marked **Changes made**, and its page shows your request beside what they changed. |
| Reject | The record is closed: it stays out of public views and can no longer be corrected or decided. The contributor can submit it again as a new contribution. A note is required, and the contributor sees it. |

A record needs at least one evidence URL and site coordinates before it can
be approved, and a contributor may leave both out when submitting. When either
is missing, the decision panel says **Not ready to approve**, Approve is
unavailable, and **Needs changes** is selected with a note asking for what is
missing. Add it yourself with **Edit record**, or send the request.

A contributor can also change a record while it waits for review, for example
to add a source; the queue then marks it **Updated while waiting**. If they
change it while you have it open, your decision is not recorded: the page
reloads with the latest version and says so, and you decide again.

A contributor whose record you reject can resubmit it from **My contributions**:
the form opens with what they sent, and the new record is linked to the rejected
one. The queue marks it **Resubmission**, its page shows the record it replaces
with your reason, and the rejected record's page links to the new one. The
earlier attempt also appears among the possible duplicates, labelled
**Rejected**.

When the contributor left an email address, the **Contributor** panel on the
record page offers **Email contributor**, which opens your email app with the
record's number in the subject, for anything the decision note cannot cover.

Decisions apply to records pending review and to records with changes
requested. If you fix a record with changes requested yourself, approve it from
its page: it does not need to go back through the queue. To find the records
waiting on their contributors, filter **Submission history** by
**Changes requested**; *Last updated* shows when each was sent back and how many days it has waited. Reject one
whose changes never arrive, with a note such as "No reply after 30 days".

Each decision is kept, with your email, the note and the time, in the record's
history, together with every correction and the contributor's original
submission.

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
