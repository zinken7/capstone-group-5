# User guide

The Mining Market Map is an open register of autonomous and teleremote mining
equipment: where it is deployed, how much of it, and who supplies the
automation. Anyone can browse it and anyone can contribute to it. Nothing a
contributor submits appears in public until an administrator has checked it
against its evidence, so every record you see is verified.

The site is at https://capstone-group-5.vercel.app/. The four tabs in the
header are **Map**, **Equipment Register**, **Analytics** and **Contribute**.
The data is licensed CC BY 4.0; **About the data** in the footer says where it
comes from. Reviewers have their own guide: [`admin-guide.md`](admin-guide.md).

## Map

The map shows one marker per mine site, coloured by the most advanced
deployment status at that site (operational, commissioning, announced, or
decommissioned only) and sized by machines in service. The legend at the
bottom left explains both.

- **Filter** with the panel on the left: technology supplier, machine type,
  country and automation level. **More filters** opens the rest, and
  **Clear all** resets them. **Sites in view** lists the sites that match.
- **Open a site** by clicking its marker or its name in the list. The panel
  shows each deployment there with its machine, supplier, quantity and status.
  **View in register** opens those records in the Equipment Register;
  **Zoom to site** centres the map on it.
- **Go back in time** with the slider at the bottom: *Deployments in service
  at the end of* a given year. The counts and markers follow it, so you can see
  how the market grew.
- **Include decommissioned deployments** adds equipment that has been
  withdrawn from service.

## Equipment Register

The register is the data itself, one row per deployment. **Search** by site,
machine model or company; filter by machine type, automation level, status,
environment, supplier and country; sort a column by clicking its heading.
**Download CSV** exports the rows that match your filters, for a spreadsheet or
your own analysis.

To report an error in a verified record, use **Correct** at the end of its row
(see *Correct a verified record* below).

## Analytics

Analytics shows the market as a whole: machines in service over time, the
share at each automation level, machines by country, and by technology
supplier. Every chart follows the filters at the top of the page, and
selecting a bar or tile filters the other charts too. **Show as table** gives
the numbers behind any chart. The counts are over verified records only.

## Contribute a deployment

1. Open **Contribute**. Read **Before you submit**: only submit information
   you are authorised to disclose, and only equipment with an automation
   product fitted.
2. Fill in the deployment: mine site and country, machine type and
   manufacturer, quantity, and the commissioning date or year. Site latitude
   and longitude are optional at submission, but approval needs them, so enter
   both if you can; a new site cannot appear on the map without them.
3. **Add more detail** opens the optional fields: technology supplier and
   product, the automation level (choose one, or leave it unrecorded), and a
   contact email, which is shown only to administrators and is used only to
   follow up your submission.
4. Add at least one **evidence** link, a public web page that supports what
   you entered. A record cannot be approved without one.
5. **Submit**. The confirmation tells you if anything approval needs is still
   missing, and links to **My contributions**.

Your submission goes into the review queue. It becomes public when an
administrator approves it.

## Follow your submissions

The Contribute page has two tabs. **My contributions** lists every submission
made from this browser, with its status and, for *Changes requested* or
*Rejected*, the reviewer's note. The list is refreshed each time you open the
site. No account is needed: each submission has a private key that is kept in
this browser only, so the list is yours alone. Clearing the browser's site
data removes it; **Remove from this browser** removes one entry.

| Status | Meaning |
|---|---|
| Pending review | Waiting for an administrator. You can still **Update submission** to add or fix something. |
| Changes requested | The reviewer needs something from you. Read the note, then **Update submission**; it returns to the queue. |
| Verified | Approved and public. **View on register** opens it. |
| Rejected | Closed, with the reviewer's reason. It will not be reviewed again, but you can submit it again as a new contribution, prefilled from this one and linked to it, so the reviewer sees the earlier decision. |

To see your submissions on another device, use the private tracking link
offered when you submit. Anyone with that link can see and update the
submission, so treat it like a password.

## Correct a verified record

**Correct**, at the end of a row in the Equipment Register, proposes a change to
a verified record: the quantity, status, automation level, environment,
installation type, dates or evidence. Your proposal is reviewed like a new
submission, and the record stays as it is in public until an administrator
accepts it. A record's site, manufacturer, model or machine type cannot be
corrected; if one is wrong, say so in a note and the reviewer will reject and
ask for a fresh submission. Corrections you propose also appear under **My
contributions**.

## For reviewers

Administrators sign in from **Administrator sign-in** in the footer. Reviewing,
approving, requesting changes and correcting records are described in
[`admin-guide.md`](admin-guide.md).

<!-- CHECK on staging before committing, then delete this comment:
  1. Where the evidence link field sits on the form (step 4): in the main
     fields, or under Add more detail?
  2. The exact label and wording of the contact email field (step 3).
  3. The resubmit control on a Rejected row: its label (Rejected row).
  4. Where the tracking link is offered: on the confirmation, or on the row?
  5. The correction form: which fields it offers, and whether it asks for an
     email or a note (Correct a verified record).
-->
