# UI mockups

Design mockups for the Autonomous Mining Equipment Market Map. These are **static mockups only** — no real data, no working interactions. They exist to agree the layout, navigation and colour system before we build.

All figures shown (machine counts, sites, percentages) are **placeholder data**.

## Screens

| File | Screen | Shows |
|---|---|---|
| `mockup_map.png` | **Map** | Geospatial view. Filters (technology supplier, country, machine type, automation level), status-coloured markers, site detail card, time slider. |
| `mockup_analytics.png` | **Data → Analytics** | Stats strip, headline tiles, deployments-over-time chart, and the full colour palette with contrast ratios. |
| `mockup_equipment.png` | **Data → Equipment** | Filterable record table with per-row Edit, verified / unverified states, pagination. |
| `mockup_contribute.png` | **Contribute** | Submission form. Seven visible fields, advanced fields collapsed behind "Add more detail". |

## Navigation

```
Map  |  Data  |  Contribute
        └─ [ stats strip · Export CSV ]
        └─ Analytics | Equipment
```

## Colours

| Role | Hex | Contrast on `#14141a` |
|---|---|---|
| Page background | `#0d0d0f` | — |
| Panel surface | `#14141a` | — |
| UWA navy — **fill only** | `#27348B` | 1.70:1 ✗ |
| Accent (lightened UWA blue) | `#5e76df` | 4.48:1 ✓ |
| UWA gold — highlights | `#E2B600` | 9.54:1 ✓ |
| Primary text | `#ffffff` | 18.4:1 |
| Secondary text | `#c3c2b7` | 10.2:1 |
| Muted / axis labels | `#898781` | 5.1:1 |

**UWA navy `#27348B` must not be used for text, icons or chart marks on a dark background** — at 1.70:1 it fails WCAG (3:1 minimum for graphics, 4.5:1 for body text). Use it as a background fill only; white text on navy measures 10.8:1.

Chart series, in fixed order — never reassign or cycle:

`#5e76df` · `#d95926` · `#199e70` · `#c98500` · `#d55181` · `#008300`

Only the **first three** are safe when any two colours can appear side by side (map markers, scatter plots). Past three, use shape as well as colour.

Deployment status colours are reserved and never reused for a data series:

| Status | Hex |
|---|---|
| Operational | `#0ca30c` |
| Commissioning / testing | `#fab219` |
| Announced | `#ec835a` |
| Decommissioned | `#898781` |

## Source files

`src/` holds the HTML used to generate each PNG. Open any of them directly in a browser — no build step, no dependencies.

| File | Notes |
|---|---|
| `src/theme.css` | Shared colour variables and common components. Start here. |
| `src/mockup_map.html` | Coastlines and borders are inlined SVG paths from Natural Earth (via the `world-atlas` dataset), hence the file size. |
| `src/mockup_analytics.html` | |
| `src/mockup_equipment.html` | |
| `src/mockup_contribute.html` | |

To regenerate the PNGs, screenshot at 1600px wide.

## Status

Layout and colours are proposed, not final. Open points are tracked in the design decisions doc; the main one is what qualifies as "autonomous enough" for inclusion in the dataset.
