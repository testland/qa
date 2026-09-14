# Change shape - dispatch-api

**Window:** 2026-06-15 to 2026-09-12 (90 days), 214 non-merge commits.
Generated 2026-09-13 by the estimation tooling. Regenerating takes ~40 minutes.

| Shape         | Commits | % commits | Files changed | % files |
|---------------|--------:|----------:|--------------:|--------:|
| service-layer |     133 |       62% |           487 |     64% |
| pure-logic    |      51 |       24% |           162 |     21% |
| ui-heavy      |      19 |        9% |            71 |      9% |
| data-heavy    |      11 |        5% |            44 |      6% |
| (mixed)       |       7 |         - |             - |       - |

Dominant shape: service-layer, driven by `src/routes/`, `src/carriers/` and
`src/repositories/`.

Not decided here: target layer ratios, effort hours, and test selection are
downstream decisions.
