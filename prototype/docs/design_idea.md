Hey team 👋 — design idea. Mockups attached. Have a look before Tuesday.

**First, spend 5 minutes here:** https://avmap.io/

It's a crowdsourced map of autonomous vehicle deployments worldwide — basically our project, but for self-driving cars. Adrian showed it in our meeting. Click through **Map**, then **Data**, then try their **Contribute** page. The second one he showed is worth a look too: https://www.templetons.com/brad/robocars/autonomap.html

I've mocked up four screens based on it. Nothing is locked in — push back on any of it.

---

## 1. Three main tabs — Map · Data · Contribute

These map onto the three parts Adrian described in the meeting:

| Tab | What it's for |
|---|---|
| **Map** | Browse and orient — "poke around and learn as you go" |
| **Data** | The statistics, and the dataset itself |
| **Contribute** | Crowdsourced submissions |

**Why "Contribute"** rather than "Submit Data" or "Upload": it describes what the *user* does, not what the system does, and it's the standard across crowdsourced projects (Wikipedia, OpenStreetMap, CSRankings). "Submit" sounds like filing paperwork. "Upload" implies bulk files, which Adrian said will be rare — he expects only 5–10 people to ever hand over a full database.

## 2. Inside Data — Analytics and Equipment

Analytics belongs inside Data rather than as its own top-level tab, so it sits underneath as a sub-tab, same as avmap does it.

- **Analytics** — the dashboard. CAGR by country, % autonomous, breakdown by technology supplier.
- **Equipment** — the filterable list of records, with CSV export.

Also copied from avmap: a **stats strip** above both sub-tabs, with **Export CSV** living there permanently so you can export from any view.

## 3. Dark theme with UWA colours

Dark like avmap, with UWA navy and gold.

One thing I checked: **UWA navy `#27348B` only reaches 1.7:1 contrast on a dark background**, so it fails accessibility as a text or chart colour. We use it as a *fill* — logo, panels — and a lightened version of the same blue, `#5e76df`, for anything that needs to be readable. **UWA gold `#E2B600` works well on dark** (9.5:1), so it carries the headline number and active states.

Full palette with contrast ratios is on the Analytics mockup.

## 4. The map

Real coastlines and borders, markers coloured by deployment status, filters down the left (technology supplier, country, machine type, automation level), and a time slider so you can watch the market build up year by year — Adrian specifically liked that feature on the reference site.

Two things worth taking from Templeton's map:

- **Status shown as marker colour**, so the map is readable without clicking anything.
- **Honest labelling of data quality.** He states plainly that many points are company-supplied and unverified. That's the same verified/unverified split Adrian wants, and being upfront about it builds more trust than hiding it.

## 5. Contribute

I've kept the form short on purpose: seven fields visible, everything else (owner, operator, contractor, commodity, payload, sensors) collapsed behind "Add more detail". Corrections use an **Edit** button on each record rather than a separate form — see the Equipment mockup.

**Other considerations:**

- **Mandatory fields** — mine site, machine type, quantity and automation level. These are the minimum required for the map and the headline statistics. All other fields optional, including technology supplier, which many contributors will not know.
- **Source link — optional, but it raises the confidence level.** A source is anything published that supports the entry — a trade article, a manufacturer press release, a supplier case study, an annual report. For example: [Roll out of autonomous haulage system at Roy Hill creates world's largest single autonomous mine](https://im-mining.com/2023/01/12/roll-out-of-autonomous-haulage-system-at-roy-hill-creates-worlds-largest-single-autonomous-mine/) (*International Mining*). An entry with a source that checks out is verified fastest. Entries submitted without one are still accepted, but remain unverified and are excluded from the default view, so they do not affect the headline statistics.
- **Accounts — not required.** Anonymous submissions are accepted and remain unverified. Signing in, either with a new account or an existing Microsoft or Google account, confirms the contributor's email domain. Someone submitting from a `@bhp.com` address about a BHP site can then be shown with a BHP affiliation badge and prioritised for verification.
- **Editing — open to all users.** Most contributions are expected to be corrections to existing records. Two safeguards: previous versions are retained so an incorrect edit can be reverted, and any edit to a verified record returns it to unverified pending re-review.

Nothing here is final — push back on any of it: layout, colours, naming, the rules above. Drop your thoughts in the Teams chat or bring them to the next meeting. Better we argue about it now than rebuild it in week 10.

We've got a client who actually wants this thing to exist. Let's build something he keeps running long after the semester ends 💪
