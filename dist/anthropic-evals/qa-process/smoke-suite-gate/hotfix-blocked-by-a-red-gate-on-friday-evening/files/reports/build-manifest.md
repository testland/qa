# Builds on main, last five

| Build              | Commits                      | Files touched                                                          |
|--------------------|------------------------------|------------------------------------------------------------------------|
| 2026.9.11-a41c0b9  | a41c0b9                      | src/payments/authorize.js                                              |
| 2026.9.9-c7712d5   | c7712d5, 0b18e42, 44de911    | src/catalogue/facets.js, e2e/smoke/invoice.smoke.spec.ts, src/invoices/render.js |
| 2026.9.5-9ee4c10   | 9ee4c10, 2ab7710             | src/account/profile.js, docs/runbook.md                                |
| 2026.9.2-3d0e8aa   | 3d0e8aa                      | src/search/rank.js                                                     |
| 2026.8.27-b40cc71  | b40cc71, 91aa0f2             | src/cart/totals.js, src/cart/promo.js                                  |

Commit notes:

- `a41c0b9` — "#4471 route Amex through the fallback processor". Rewrites the
  BIN-range branch in `src/payments/authorize.js` that decides which processor
  a card is sent to.
- `0b18e42` — "add invoice export to the gate". Opened 2026-09-08 after a
  customer complained the export came back empty. Nothing was taken off the
  gate when it went on.
