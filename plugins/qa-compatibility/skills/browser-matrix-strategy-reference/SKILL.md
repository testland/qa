---
name: browser-matrix-strategy-reference
description: "Pure-reference for designing and reviewing a browser / OS / device test matrix from traffic data - the T1/T2/T3 tier-membership heuristics (T1 >=5% traffic, T2 1-5% or statutory, T3 <1% with customer demand), the traffic-share sources (own analytics, StatCounter, MDN browser-compat-data), a worked matrix template with tier-change log, and how to justify dropping a legacy browser (IE11, old iOS Safari). Use when designing an initial matrix, running a quarterly re-tier review, or making the case to drop a browser. This is the WHAT-to-test strategy reference - to execute the matrix use the runners browser-matrix-runner (bundled engines) or selenium-grid-4-runner (self-hosted); to cap and publish committed support tiers use compatibility-budget."
---

# browser-matrix-strategy-reference

## Overview

A real browser matrix tiers browsers by traffic share, regulatory requirement, and team budget, then runs each tier at its own cadence - not "test on everything".

This skill is a **pure reference** consumed by the cloud-grid
skills
(`browserstack-automate`,
`saucelabs-automate`,
`lambdatest-automate`)
+ the self-hosted `selenium-grid-4-runner`
+ existing
`browser-matrix-runner`
(bundled engines).

## When to use

- New project - defining the initial browser matrix.
- Quarterly review - re-tier browsers as traffic shifts (e.g.,
  IE11 traffic drops to <0.1%, demote from T2 to T3).
- Audit / compliance - defending why specific browsers were tested
  (or weren't).
- Cost optimisation - moving low-tier browsers from cloud grid
  (paid) to bundled engines (free).

## How to use

1. Pull browser / OS / version traffic share from your own analytics; supplement
   with StatCounter for geographies your own data is thin on.
2. Apply the tier-membership heuristic (defined once below) to place each combo in
   T1, T2, T3, or out of scope.
3. Group Chromium-engine browsers (Brave, Vivaldi, Opera) under the dominant
   browser instead of counting them as separate combos.
4. Map each tier to infrastructure via the cost-tier mapping: bundled engines for
   T1, cloud grid for T2 / T3, self-hosted Selenium Grid 4 for internal apps.
5. Record the matrix using [references/matrix-template.md](references/matrix-template.md),
   giving every row an owner, a review date, and a "Why".
6. Log every tier change in the tier-change log so audit and "why is X here?"
   questions have a written answer.
7. Re-run quarterly: re-tier as traffic shifts, retire below-threshold combos,
   and defend legacy drops (IE11, old iOS Safari) against your own analytics.
8. **Verify before dropping a combo:** assert traffic <0.1% across two independent
   sources (own analytics + StatCounter) AND that no statutory or SLA requirement
   applies; if either check fails, keep the combo in T3 and re-review next quarter.

## The three-tier model

Cadence per tier; exact traffic thresholds are defined once in the
Tier-membership heuristic section below.

| Tier | Cadence | Coverage criterion | Example |
|---|---|---|---|
| **T1 - Must pass every PR** | Per-PR + main | Highest-traffic, must-not-break combos | Chrome current + Chrome-1 |
| **T2 - Pre-release / nightly** | Nightly + pre-release | Mid-traffic OR statutory (regulated industries) | Firefox / Safari / Edge current |
| **T3 - Quarterly / on-demand** | Quarterly | Long-tail with customer demand | Safari iOS 16 / IE11 / niche Android |

## Data sources for traffic share

| Source | Use for |
|---|---|
| **Your product's own analytics** (GA / Plausible / etc.) | Definitive ground truth for *your* users |
| **StatCounter** ([gs.statcounter.com](https://gs.statcounter.com/)) | Global / regional baseline when own data thin |
| **MDN browser-compat-data** ([github.com/mdn/browser-compat-data](https://github.com/mdn/browser-compat-data)) | Per-feature compatibility map - which versions support a given Web API |
| **caniuse.com** | Same purpose as MDN, easier UI |
| **web-platform.org browser support** ([webstatus.dev](https://webstatus.dev/)) | Web Platform features cross-browser readiness |
| **GitHub Actions browser-default versions** ([github.com/actions/runner-images](https://github.com/actions/runner-images)) | What CI runners ship with by default |

Use your own analytics for traffic-share decisions; supplement
with StatCounter when slicing geographies you don't have own data
for.

## Worked example

A hypothetical SaaS B2B web app builds its first matrix from its own analytics:

1. **Pull traffic share.** Own analytics shows Chrome 68%, Firefox 12%, Safari
   8%, Edge 5%, mobile Safari 9% of mobile traffic, mobile Chrome 5% of mobile,
   Safari iOS 16 2% of mobile and declining.
2. **Apply the heuristic.** Chrome 68% and Firefox 12% clear the T1 traffic bar, so
   both go to T1 (Chrome adds an N-1 row for Group-Policy lag-behind users).
   Safari 8%, Edge 5%, mobile Safari, and mobile Chrome fall in the T2 band or
   count as significant mobile platforms, so they go to T2. Safari iOS 16 at 2%
   and declining goes to T3.
3. **Rule browsers out.** A customer survey returns 0 IE11 users with no
   statutory requirement, so IE11 is out of scope; Brave and Vivaldi are
   Chromium-based and already covered by Chrome T1.
4. **Map to infrastructure.** T1 runs on bundled Playwright engines on CI (free,
   fast); T2 and T3 run on a cloud grid (real devices, nightly and quarterly).
5. **Log the change.** Edge grew 3 -> 5% since last quarter, so it is promoted
   from T3 to T2 and the promotion is recorded in the tier-change log.

Result: a 3-combo T1, 5-combo T2, 4-combo T3 matrix with a documented reason per
row. The filled-in artifact is
[references/matrix-template.md](references/matrix-template.md).

## Tier-membership heuristic

The single authoritative traffic thresholds, referenced by the three-tier model
and worked example above. A browser belongs in:

- **T1** if any of:
  - Currently ≥5% of own traffic, AND
  - "Most users" (statistically reasoned, not gut)
  - Browser the team uses internally (dogfooding)

- **T2** if any of:
  - 1-5% of own traffic
  - Required by stakeholder commitment / SLA
  - Required by regulation (e.g., accessibility on Safari iOS for
    AppStore review)
  - Mobile platform with significant traffic

- **T3** if any of:
  - <1% traffic but customer-requested
  - Long-tail enterprise (ESR / extended-support tracks)
  - Coverage-completeness for audit defensibility

- **Out of scope** if all of:
  - <0.1% traffic
  - No customer commitment
  - No regulatory requirement
  - Already covered by an engine-compatible browser (e.g., Brave
    covered by Chrome)

## Cost-tier mapping

Where to test each tier:

| Tier | Recommended infrastructure | Reason |
|---|---|---|
| T1 | Bundled engines (Playwright + Chromium / Firefox / WebKit) on CI runner | Free; fast; sufficient for engine-level coverage |
| T2 | Cloud grid (BrowserStack / Sauce / LambdaTest) | Real devices + real OS; manageable cost at nightly cadence |
| T3 | Cloud grid on-demand | Real device + low-frequency; budget-friendly |
| Internal apps | Self-hosted Selenium Grid 4 + tunnels | Data residency or cost-control |

For very high-volume + cost-sensitive teams, self-hosted Selenium
Grid 4 for T1 + cloud grid for T2 / T3 is the optimum mix.

## Engine vs runner distinction

A T1 entry "Chrome latest" can mean:

- **Bundled Chromium engine in Playwright** - fast, free, but
  engineered for testing (not 1:1 with stable Chrome)
- **Real Chrome stable channel via cloud grid** - slower, paid,
  but exactly what users have

For T1 the bundled-engine path is usually sufficient; for T2 / T3,
real-browser via cloud grid is the choice when the difference
matters (some bugs are real-Chrome-only).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "Test on all browsers" without tiering | Wastes resources; nothing actually gates the release | Tier explicitly |
| Tier membership never reviewed | Drift: T3 browsers stay in T3 long after traffic dies | Quarterly review |
| Same tests across all tiers | Some tests are environment-specific; running all everywhere is wasteful | Smoke at T1 / T2 / T3; full regression at T1 only |
| Counting Chromium-engine browsers separately (Chrome, Brave, Vivaldi, Opera) | Same engine; one test covers them | Group by engine; test the dominant browser only |
| IE11 in 2026 | Trivial traffic in nearly all contexts | Audit own analytics before committing |
| Mobile and desktop in same tier | Different breakage surfaces | Treat mobile as its own dimension |
| No tier-change log | "Why is Safari 14 in T2?" - nobody remembers | Always log tier changes |

## Limitations

- **Own-analytics blindness.** Bot traffic + anonymised users can
  skew traffic counts; sanity-check via two sources.
- **Cross-region traffic differs.** Global average + your specific
  market may diverge; segment.
- **Bundled engines aren't real browsers.** Playwright's
  Chromium / WebKit have engineering-for-testing edits; for some
  bugs only real-browser cloud grids catch.
- **Real-device matrices shift.** Cloud grids retire devices /
  add new ones; quarterly check.

## References

- StatCounter GlobalStats - 
  [gs.statcounter.com](https://gs.statcounter.com/).
- MDN browser-compat-data - 
  [github.com/mdn/browser-compat-data](https://github.com/mdn/browser-compat-data).
- caniuse.com - [caniuse.com](https://caniuse.com/).
- web-platform-tests / web-platform.org - 
  [web-platform-tests.org](https://web-platform-tests.org/).
- Web feature status - [webstatus.dev](https://webstatus.dev/).
- GitHub Actions runner-images - 
  [github.com/actions/runner-images](https://github.com/actions/runner-images).
- W3C WebDriver specification - 
  [w3.org/TR/webdriver2/](https://www.w3.org/TR/webdriver2/).
- Sibling skills:
  `browser-matrix-runner`
  (existing - bundled engines),
  `selenium-grid-4-runner`,
  `browserstack-automate`,
  `saucelabs-automate`,
  `lambdatest-automate`.
