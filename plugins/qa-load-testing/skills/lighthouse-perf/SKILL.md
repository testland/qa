---
name: lighthouse-perf
description: "Use when a web frontend needs Core Web Vitals (LCP, INP, CLS) checked on every PR, or its first performance budgets drafted. Sets up Lighthouse CI with Google's thresholds at the 75th percentile, per-route budgets by page type, resource-size budgets, report artifacts and PR comments."
---

# lighthouse-perf

## Overview

The **Core Web Vitals** are Google's three canonical user-experience
metrics ([web-vitals][webvitals]):

[webvitals]: https://web.dev/articles/vitals
[inp]: https://web.dev/articles/inp
[lh-inp]: https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/metrics/interaction-to-next-paint.js
[lh-tbt]: https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time

| Metric | Measures              | "Good" threshold        |
|--------|-----------------------|--------------------------|
| **LCP** (Largest Contentful Paint) | Loading performance    | ≤ **2.5 seconds**           |
| **INP** (Interaction to Next Paint) | Interactivity         | ≤ **200 milliseconds**      |
| **CLS** (Cumulative Layout Shift) | Visual stability       | ≤ **0.1**                   |

INP became a stable Core Web Vital in 2024, replacing FID
([web-vitals][webvitals]). The canonical measurement standard is
**the 75th percentile** of page loads, segmented across mobile and
desktop ([web-vitals][webvitals]).

INP needs a real user interaction, so a Lighthouse navigation run (what
`lhci autorun` does) cannot report it: the `interaction-to-next-paint`
audit only runs in timespan mode ([lh-inp][lh-inp]). In the lab, gate on
Total Blocking Time (TBT), which web.dev calls "a reasonable proxy metric
for INP, but it's not a substitute for INP" ([inp][inp]), and track INP
itself from field data (see "Lab vs field" below).

[lhci]: https://github.com/GoogleChrome/lighthouse-ci

This skill covers **Lighthouse CI** (`@lhci/cli`) - the official
Google Chrome team tool for running Lighthouse on every PR and
asserting against budgets ([lhci][lhci]).

## When to use

- The project ships a web frontend (Next.js, Vite, Remix, plain
  static, etc.).
- The team has documented Web Vitals NFRs (per `non-functional-requirement-extractor`)
  and needs CI enforcement.
- A PR's perf delta vs. main needs to be visible (regression-block
  or just-warn).
- The team uses Lighthouse for accessibility / SEO / best-practices
  audits beyond perf.

If the project is a backend API or a CLI tool, this skill doesn't
apply - use `k6-load-testing` or a
sibling load runner for backend perf.

## Install

```bash
npm install --save-dev @lhci/cli
```

(Per [lhci][lhci]; the docs reference `@lhci/cli@0.15.x` as the
current major.) Pin to a specific minor in CI for determinism.

## Configure

Create `.lighthouserc.js` (or `.lighthouserc.json`) at the project
root. The canonical shape per [lhci][lhci]:

```js
module.exports = {
  ci: {
    collect: {
      // What to audit
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/pricing',
      ],
      // How many runs per URL - median report wins; 3 is canonical for stability
      numberOfRuns: 3,
      // Lighthouse settings
      settings: {
        preset: 'desktop',                       // or 'mobile' (default)
        chromeFlags: '--no-sandbox',              // CI-runner-friendly
      },
      // Use a static-server when running headless in CI
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
    },
    assert: {
      // Canonical Web Vitals budgets per web.dev/articles/vitals
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],   // 2.5s
        // INP is timespan-only in Lighthouse; TBT is its lab proxy.
        // 200 ms = Lighthouse's mobile "fast" band; use 150 with preset: 'desktop'.
        'total-blocking-time':       ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1 }],    // 0.1
        // Lighthouse category scores (0-1)
        'categories:performance':    ['warn',  { minScore: 0.9 }],
        'categories:accessibility':  ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn',  { minScore: 0.9 }],
      },
    },
    upload: {
      // Where to upload the .json reports for trend analysis
      target: 'temporary-public-storage',   // or 'lhci' for self-hosted server
    },
  },
};
```

Assertion levels per [lhci][lhci]:

- `'error'` - fails the CI run (exits non-zero).
- `'warn'` - surfaces in the report but doesn't fail.
- `'off'` - disabled (useful for opt-out per-page).

## Running

The canonical invocation per [lhci][lhci]:

```bash
lhci autorun
```

`autorun` runs three phases in sequence:

1. **collect** - start the server (if `startServerCommand` set), run
   Lighthouse N times per URL.
2. **assert** - compare results against the assertion config; exit
   non-zero on `error`-level failures.
3. **upload** - upload reports to the configured target for trend
   tracking.

For finer control, the phases can run independently: `lhci collect`,
`lhci assert`, `lhci upload`.

### Running specific URLs

For a single PR-relevant audit:

```bash
lhci collect --url=http://localhost:3000/dashboard --numberOfRuns=3
lhci assert
```

## CI integration

```yaml
# .github/workflows/lighthouse.yml
name: lighthouse

on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build

      - name: Lighthouse CI
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}   # optional, for PR comments
        run: npx lhci autorun

      - name: Upload Lighthouse reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports
          path: .lighthouseci/
          retention-days: 14
```

The optional `LHCI_GITHUB_APP_TOKEN` (set up via the Lighthouse CI
GitHub App) enables PR comments showing the per-metric delta vs. the
main branch's last green run.

## Authoring budgets

Budget authoring is part of Lighthouse CI configuration: picking per-route
LCP / INP / CLS thresholds by traffic class, resource-size caps in
`budget.json`, the `assertMatrix` config shape, and how to validate a new
budget against production before committing it, are all in
[references/budgets.md](references/budgets.md). Start there when the project
has no budgets yet or the existing ones need a redesign.

## Mobile vs desktop budgets

LCP / INP thresholds are the same across mobile and desktop, but
**mobile is consistently slower** in practice - the same JS bundle
runs on a less-powerful CPU over a less-stable network.

Common pattern: separate `.lighthouserc.mobile.js` and
`.lighthouserc.desktop.js`, run both in CI. The mobile run uses
`preset: 'mobile'` (default) which applies CPU + network throttling
to simulate a mid-range Android device.

```bash
# Run both
LHCI_BUILD_CONTEXT__GITHUB_BASE_URL=https://github.com/... \
  npx lhci autorun --config=.lighthouserc.mobile.js
npx lhci autorun --config=.lighthouserc.desktop.js
```

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| `numberOfRuns: 1`                                              | Single-run measurements are noisy; flaky alerts.                  | Use 3 (canonical) or 5 for high-stakes pages; LHCI uses the median. |
| Asserting on `first-input-delay` (FID)                          | FID was retired in 2024 ([web-vitals][webvitals]).                 | Gate on `total-blocking-time` in the lab and track INP in field data. |
| Asserting on `interaction-to-next-paint` in `lhci autorun`      | The INP audit runs only in timespan mode ([lh-inp][lh-inp]), so a navigation run has no INP to check. | Gate on `total-blocking-time` (lab proxy, [inp][inp]); track INP with the `web-vitals` library in production. |
| Hard error on every metric out of the box                       | Existing pages may not meet thresholds; team learns to ignore the gate. | Start with `warn` for everything; promote to `error` once green for 2 weeks. |
| Auditing only the homepage                                     | The homepage is usually the most-optimized page; misses regressions on long-tail routes. | Audit a representative URL set: home + 1 logged-in dashboard + 1 long-form content + 1 form-heavy. |
| Lighthouse score as the sole metric                             | Lighthouse score conflates multiple subscores; doesn't isolate which Web Vital regressed. | Assert on the individual metrics (`largest-contentful-paint`, `total-blocking-time` as the INP proxy, `cumulative-layout-shift`); category score is supplementary. |
| Running against production                                       | Lighthouse fires real network requests and triggers analytics; pollutes prod metrics. | Always against staging or a local build. |

## Lab vs field

Lighthouse CI measures **lab data** (synthetic; deterministic
runner). Field data (real-user metrics, RUM) is measured by Web Vitals
JS in production. Both matter:

| Source         | Tool                                | Use for                                |
|----------------|-------------------------------------|----------------------------------------|
| Lab (synthetic)| Lighthouse CI                        | Per-PR regression gate.                 |
| Field (RUM)    | `web-vitals` library + analytics     | Real-user 75th-percentile tracking.    |

Lighthouse CI catches per-PR regressions; field data tracks the
75th-percentile threshold per [web-vitals][webvitals]. Don't substitute
one for the other.

## References

- [web-vitals][webvitals] - canonical Core Web Vitals definitions and
  thresholds (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; 75th-percentile
  measurement; INP-replaces-FID in 2024).
- [lh-inp][lh-inp] - Lighthouse's `interaction-to-next-paint` audit
  source (`supportedModes: ['timespan']`).
- [inp][inp] - web.dev on INP: lab tools that only observe page load
  can't report it; TBT is a proxy, not a substitute.
- [lh-tbt][lh-tbt] - Lighthouse TBT scoring bands (mobile 0-200 ms fast,
  desktop 0-150 ms fast).
- [lhci][lhci] - Lighthouse CI canonical install, `lhci autorun`,
  configuration shape, assertion levels.
- [references/budgets.md](references/budgets.md) - drafting per-route
  budgets and `budget.json` resource-size caps at design time.
- `perf-budget-gate` - downstream
  unified gate aggregating Lighthouse + load-runner verdicts.
- `non-functional-requirement-extractor` - upstream skill that surfaces Web Vitals NFRs from PRDs.
