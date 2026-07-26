# Worked matrix template

A copy-paste template for a committed browser test matrix, filled in for a
hypothetical SaaS B2B web app. Replace the traffic numbers with your own
analytics, keep the per-row "Why" and the tier-change log, and set real owner /
review dates.

```markdown
# Browser test matrix - Q2 2026

**Owner:** QA lead
**Reviewed:** YYYY-MM-DD
**Next review:** Q3 2026

## Tier 1 - must pass every PR (3 combos)

| Browser | Version | OS | Why T1 | Where tested |
|---|---|---|---|---|
| Chrome | latest stable | Linux | 68% of traffic | `playwright-testing` on CI |
| Chrome | latest-1 (N-1) | Linux | Lag-behind users (Group Policy) | `playwright-testing` on CI |
| Firefox | latest stable | Linux | 12% of traffic | `browser-matrix-runner` (bundled) |

## Tier 2 - nightly + pre-release (5 combos)

| Browser | Version | OS | Why T2 | Where tested |
|---|---|---|---|---|
| Safari | 17 | macOS Sonoma | 8% traffic; Apple-platform-only | BrowserStack Automate |
| Safari iOS | 17 | iOS 17 | Mobile Safari = 9% mobile traffic | BrowserStack Automate (real device) |
| Edge | latest | Windows 11 | 5% traffic | BrowserStack Automate |
| Chrome | latest | Android 14 | 5% mobile traffic | BrowserStack Automate (real device) |
| Firefox | ESR | Linux | Enterprise users on long-support track | `browser-matrix-runner` |

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
