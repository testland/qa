# CI numbers and Pulsemetrics numbers, August 2026

Pulled 2026-09-01 by Wren.

- CI column: median of 3 runs per URL on the merge commit, desktop preset,
  GitHub-hosted runner, warm build, no extensions. The CI browser signs in as
  `ci-fixture@halloway.test`, a synthetic member with no insurance plan attached.
- Pulsemetrics column: 75th percentile of real page loads, 28-day window, every
  device and connection our members actually use.

| Route              | CI loading (median) | Field loading (p75) | CI layout shift | Field layout shift (p75) |
|--------------------|---------------------|---------------------|-----------------|--------------------------|
| /portal            | 2.21 s              | 4.93 s              | 0.02            | 0.14                     |
| /portal/messages   | 1.84 s              | 3.71 s              | 0.01            | 0.09                     |
| /appointments      | 2.60 s              | 6.02 s              | 0.03            | 0.21                     |

Field session mix in the same window: 68% mobile, 29% desktop, 3% tablet. 41% of
sessions arrive with a cold cache. The slowest decile is on 3G-class links.

Route note: `/appointments` renders the Cascadia insurance-eligibility widget for
members whose plan is in the partner network, about 22% of sessions in the
window. It is a third-party embed and it lays itself out after the page paints.
