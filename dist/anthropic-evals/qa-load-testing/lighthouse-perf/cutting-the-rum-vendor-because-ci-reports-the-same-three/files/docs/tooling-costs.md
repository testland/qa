# Performance line items, FY27 review

| Vendor / item      | Monthly | What it does                                                                 | Owner |
|--------------------|---------|------------------------------------------------------------------------------|-------|
| Pulsemetrics       | $1,420  | Collects loading / interactivity / layout metrics from real browser sessions via `src/vitals.mjs`, aggregates to a 28-day 75th percentile per route, alerts on regression. | Wren |
| Beacon Nightly     | $310    | Runs one synthetic audit of `https://portal.halloway.health/` at 03:00 daily and emails a PDF with a score and the three metrics. | ops |
| CI perf job        | $0      | `lhci autorun` on every pull request against a locally built preview, 3 runs per URL, 4 URLs, per-route budgets, blocks the merge. Added 2026-03-16. | Marisol |
