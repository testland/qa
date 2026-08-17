# PR #5120 — e2e job, 11 days, 31 runs on the branch

| Test                                | Runs | Failures | Rate  | On main before this PR      |
|-------------------------------------|------|----------|-------|-----------------------------|
| nav sidebar collapses on mobile     | 31   | 4        | 12.9% | yes — 11.4% over 290 runs   |
| subscription upgrade prorates       | 31   | 19       | 61.3% | no — added by this PR       |
| subscription cancel refunds prorata | 31   | 0        | 0.0%  | no — added by this PR       |

Notes:

- `nav sidebar collapses on mobile` has been intermittent on main since
  2026-03-xx. Ticket #3980 open, owner @web-platform (lead @kdavies). Nobody
  has worked on it this quarter.
- `subscription upgrade prorates` was written in this PR. It has never passed
  on two consecutive runs. Its failures are an assertion mismatch on the
  prorated amount: expected 12.33, received 12.34 on 11 of the 19, and 12.32 on
  the other 8. No timeouts, no network errors.
- Author: @rmatthews. Billing surfaces are owned by @web-platform.
