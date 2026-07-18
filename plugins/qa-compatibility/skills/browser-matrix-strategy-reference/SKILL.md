---
name: browser-matrix-strategy-reference
description: "Pure-reference for designing and reviewing a browser / OS / device test matrix from traffic data. Covers the T1/T2/T3 tier-membership heuristics (T1 currently >=5% of traffic, T2 1-5% or statutory, T3 <1% but with customer demand), the traffic-share data sources (own analytics, StatCounter, MDN browser-compat-data), a worked B2B SaaS matrix template with a tier-change log for audit trails, the cost-tier infrastructure mapping (bundled engine vs cloud grid vs real device), and how to justify dropping a legacy browser (IE11, old Safari iOS). Use when designing an initial browser matrix, running a quarterly re-tier review, or building the case to drop a browser. Distinct from compatibility-budget (multi-product-type budgets and the external 'what we support' statement) and from a committed-matrix violation audit."
---

# browser-matrix-strategy-reference

## Overview

"Test on every browser" is not a strategy. A real matrix tiers
browsers by traffic share, regulatory requirement, and team budget,
then runs different tiers at different cadences.

This skill is a **pure reference** consumed by the cloud-grid
skills
(`browserstack-automate`,
`saucelabs-automate`,
`lambdatest-automate`)
+ the self-hosted [`selenium-grid-4-runner`](../selenium-grid-4-runner/SKILL.md)
+ existing
[`browser-matrix-runner`](../browser-matrix-runner/SKILL.md)
(bundled engines).

## When to use

- New project - defining the initial browser matrix.
- Quarterly review - re-tier browsers as traffic shifts (e.g.,
  IE11 traffic drops to <0.1%, demote from T2 to T3).
- Audit / compliance - defending why specific browsers were tested
  (or weren't).
- Cost optimisation - moving low-tier browsers from cloud grid
  (paid) to bundled engines (free).

## The three-tier model

| Tier | Cadence | Coverage criterion | Example |
|---|---|---|---|
| **T1 - Must pass every PR** | Per-PR + main | Currently using >5% of traffic + must-not-break | Chrome current + Chrome-1 |
| **T2 - Pre-release / nightly** | Nightly + pre-release | 1-5% traffic share OR statutory (regulated industries) | Firefox / Safari / Edge current |
| **T3 - Quarterly / on-demand** | Quarterly | <1% traffic but customer demand | Safari iOS 16 / IE11 / niche Android |

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

## Worked matrix template

For a hypothetical SaaS B2B web app:

```markdown
# Browser test matrix - Q2 2026

**Owner:** QA lead
**Reviewed:** YYYY-MM-DD
**Next review:** Q3 2026

## Tier 1 - must pass every PR (3 combos)

| Browser | Version | OS | Why T1 | Where tested |
|---|---|---|---|---|
| Chrome | latest stable | Linux | 68% of traffic | qa-web-e2e/playwright-testing on CI |
| Chrome | latest-1 (N-1) | Linux | Lag-behind users (Group Policy) | qa-web-e2e/playwright-testing on CI |
| Firefox | latest stable | Linux | 12% of traffic | qa-compatibility/browser-matrix-runner (bundled) |

## Tier 2 - nightly + pre-release (5 combos)

| Browser | Version | OS | Why T2 | Where tested |
|---|---|---|---|---|
| Safari | 17 | macOS Sonoma | 8% traffic; Apple-platform-only | BrowserStack Automate |
| Safari iOS | 17 | iOS 17 | Mobile Safari = 9% mobile traffic | BrowserStack Automate (real device) |
| Edge | latest | Windows 11 | 5% traffic | BrowserStack Automate |
| Chrome | latest | Android 14 | 5% mobile traffic | BrowserStack Automate (real device) |
| Firefox | ESR | Linux | Enterprise users on long-support track | qa-compatibility/browser-matrix-runner |

## Tier 3 - quarterly / on-demand (4 combos)

| Browser | Version | OS | Why T3 | Where tested |
|---|---|---|---|---|
| Safari iOS | 16 | iOS 16 | 2% mobile traffic; declining | BrowserStack quarterly |
| Chrome | latest | Linux ARM | <1% but B2B request | BrowserStack quarterly |
| Samsung Internet | latest | Android | <1% but high in some regions | BrowserStack quarterly |
| Opera | latest | Linux | <1%; on-demand only when customer reports | LambdaTest on-demand |

## Not in matrix (out of scope)

- IE11: customer survey 0 users; statutory not required → out of
  scope. Re-evaluate Q1 2027.
- Brave / Vivaldi: Chromium-based; covered by Chrome T1.
- Older Firefox versions (Firefox 100 and below): negligible traffic.

## Tier-change log

- 2026-Q1 → Q2: Safari iOS 15 retired (0.4% traffic, below
  threshold); Safari iOS 17 added.
- 2026-Q1 → Q2: Edge promoted to T2 (was T3) - traffic grew 3 →
  5%.
```

## Tier-membership heuristic

A browser belongs in:

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
  [`browser-matrix-runner`](../browser-matrix-runner/SKILL.md)
  (existing - bundled engines),
  [`selenium-grid-4-runner`](../selenium-grid-4-runner/SKILL.md),
  `browserstack-automate`,
  `saucelabs-automate`,
  `lambdatest-automate`.
