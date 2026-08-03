# Data Dictionary

| Entity | Important fields | Purpose |
|---|---|---|
| Organisation | name, type, website, country | Manufacturer, owner/operator or technology integrator |
| Location | name, type, parent, country, latitude, longitude, geom | Country/region/operation/mine-site hierarchy and GIS point |
| Equipment model | manufacturer, model, type, payload, operating weight, specifications | Reusable technical model information |
| Equipment instance | asset/fleet name, model, site, owner, integrator, quantity, commissioning date, status | A specific deployment or fleet at a mine site |
| Evidence source | title, URL, type, publisher, date | Public support for a deployment claim |
| Case study | title, summary, URL, media type, related entity | Related reports and media |

## Important modelling decision

`quantity` lets the MVP represent a fleet when individual machine serial numbers are unavailable. A future client decision can require one row per physical machine, retain fleet-level records, or support both through a parent deployment entity.

## Verification rule

A record cannot become `verified` unless it has at least one evidence source. Verification means a reviewer accepted the evidence; it does not guarantee that the external source itself is permanently available or independently audited.
