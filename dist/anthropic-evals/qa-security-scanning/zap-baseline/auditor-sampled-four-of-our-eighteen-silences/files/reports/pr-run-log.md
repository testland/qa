# DAST (pull request) — run log

Pulled from the Actions API on 2026-09-10. "New" means alerts in the report
whose rule id does not appear in `.zap/rules.tsv` at the time of the run.

| Date       | PR    | Alerts in report | New | Conclusion |
|------------|-------|------------------|-----|------------|
| 2026-05-08 | #2104 | 16               | 1   | failure    |
| 2026-05-11 | #2109 | 16               | 1   | failure    |
| 2026-05-12 | #2112 | 16               | 1   | success    |
| 2026-05-19 | #2130 | 16               | 0   | success    |
| 2026-06-02 | #2168 | 17               | 1   | success    |
| 2026-06-23 | #2201 | 17               | 1   | success    |
| 2026-07-14 | #2255 | 17               | 1   | success    |
| 2026-07-30 | #2291 | 18               | 2   | success    |
| 2026-08-18 | #2340 | 18               | 2   | success    |
| 2026-09-04 | #2388 | 18               | 2   | success    |
| 2026-09-09 | #2401 | 18               | 2   | success    |

Nothing has been added to `.zap/rules.tsv` since 2026-04-28.

The two "new" alerts on the recent runs are, from the PR #2401 report:

- rule 10054, `checkout.veridianpay.dev`, session cookie set without SameSite —
  this host is not covered by the 10054 line, which was written for the old
  app host pattern before checkout was split out.
- rule 90033, `checkout.veridianpay.dev`, an alert our notes call "loosely
  scoped permissions policy". First appeared 2026-07-30.

## Pentest, August 2026 (external, Ravensbourne Security)

Three findings against production. Two are ours to fix:

- **VP-2026-04 (medium)** — the checkout session cookie is set without
  `SameSite`, so it is attached to cross-site requests. Present on
  `checkout.veridianpay.dev` since the host was split out on 2026-07-28.
  Still live.
- **VP-2026-05 (low)** — permissions policy on checkout allows more than it
  needs. Still live.
