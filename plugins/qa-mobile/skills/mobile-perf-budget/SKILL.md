---
name: mobile-perf-budget
description: "Pure-reference skill for mobile-web performance budgets - Core Web Vitals at the 75th percentile mobile (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; FID retired March 2024 in favor of INP), Lighthouse mobile profile config, per-route resource budgets (JS bundle, image weight, font load). Use as the team's reference for \"what should the mobile perf gate enforce\" - paired with `lighthouse-perf` (the runner) and `lighthouse-budget-author` (the per-route author)."
rating: 22
d6: 4
---

# mobile-perf-budget

## Overview

Mobile-web performance budgets exist because:

1. Mobile networks vary (4G LTE, 3G, throttled WiFi).
2. Mobile devices vary (low-end Android, high-end iPhone).
3. Web Vitals are measured **at the 75th percentile, segmented per
   mobile vs desktop** ([web-vitals][wv]).

[wv]: https://web.dev/articles/vitals

This skill catalogs the canonical thresholds and budget patterns.

## When to use

- A mobile-web app needs perf budgets in CI.
- The team is choosing thresholds for the perf gate.
- A regression "the page got slower on mobile" needs an objective
  comparison framework.

For the runner, see [`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md).
For per-route authoring, see [`lighthouse-budget-author`](../../../qa-load-testing/skills/lighthouse-budget-author/SKILL.md).

## §1 - Core Web Vitals (current)

Per [web-vitals][wv], the **three Core Web Vitals**:

| Metric | Threshold | Measures |
|--------|-----------|----------|
| **Largest Contentful Paint (LCP)** | ≤ **2.5s** | Loading: when the largest visible element renders. |
| **Interaction to Next Paint (INP)** | ≤ **200ms** | Responsiveness: longest interaction-to-paint latency. |
| **Cumulative Layout Shift (CLS)** | ≤ **0.1** | Visual stability: unexpected layout shifts during load. |

> "Performance should be evaluated at the **75th percentile of page
> loads, segmented across mobile and desktop devices**. Pages meet
> recommendations when all three metrics hit targets for at least
> 75% of visits." ([web-vitals][wv])

The 75th-percentile rule is essential - average / median misses the
slow-tail experience.

## §2 - INP replaced FID (March 2024)

Per [web-vitals][wv]:

> "INP - Replaced First Input Delay (FID) in March 2024."

If the team has older perf docs / dashboards referencing FID, they
need updating:

- **FID** measured the delay from first input to the browser
  responding (input handler queueing).
- **INP** measures **all** interactions, not just the first, and
  the duration from input to next paint (full
  input→handler→render cycle).

INP is a stricter metric in practice. Old thresholds calibrated for
FID don't transfer.

## §3 - Per-route resource budgets

Beyond Web Vitals, per-route resource budgets catch the upstream
causes:

```json
// budget.json (Lighthouse format)
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "image", "budget": 300 },
      { "resourceType": "font", "budget": 100 },
      { "resourceType": "total", "budget": 800 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  },
  {
    "path": "/checkout",
    "resourceSizes": [
      { "resourceType": "script", "budget": 350 }   // checkout needs more
    ]
  }
]
```

Sizes are KB after compression. Per-route overrides allow
heavier-route exceptions without bloating the global budget.

## §4 - Lighthouse mobile profile

Lighthouse's default mobile profile simulates a mid-tier device:

| Setting              | Value                                  |
|----------------------|----------------------------------------|
| Form factor          | Mobile                                  |
| Network throttling   | "Slow 4G" (1.6 Mbps down, 750 kbps up, 150ms RTT) |
| CPU throttling       | 4× slowdown (vs unthrottled)            |
| Viewport             | 360 × 640                               |
| User agent           | Moto G4 (configurable)                  |

Run via:

```bash
lighthouse https://example.com --preset=mobile --output=json --output-path=./report.json
```

Or via Lighthouse CI for budget enforcement:

```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["https://staging.example.com/", "https://staging.example.com/checkout"],
      "settings": { "preset": "mobile" }
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      },
      "budgetsFile": "budget.json"
    }
  }
}
```

## §5 - Real-user monitoring (RUM) vs lab

Per [web-vitals][wv]:

> "Field measurement: Chrome User Experience Report, Chrome
> DevTools, PageSpeed Insights, Search Console
>
> Lab testing: Chrome DevTools, Lighthouse (note: Lighthouse uses
> Total Blocking Time as an INP proxy since lab environments lack
> actual user interaction)"

Two complementary measurement modes:

| Mode | Source | Use |
|------|--------|-----|
| **Field (RUM)** | Real users via the `web-vitals` JS library, Chrome User Experience Report (CrUX), Search Console | Source of truth - what users actually experience. |
| **Lab** | Lighthouse, Chrome DevTools | Pre-deploy verification; CI gate. |

A passing lab gate doesn't prove field health - RUM is the
ground truth. A failing lab gate strongly suggests field will also
suffer.

> "The web-vitals JavaScript library provides straightforward
> measurement capabilities for production implementations."
> ([web-vitals][wv])

## §6 - Threshold-by-tier (recommended starting points)

Different product types tolerate different thresholds:

| Product type            | LCP target | INP target | CLS target | Notes |
|-------------------------|-----------:|-----------:|-----------:|-------|
| News / content site      |   2.0s    |   180ms   |    0.05    | Speed is the product. |
| E-commerce checkout       |   2.5s    |   200ms   |    0.1     | CWV "good" thresholds. |
| SaaS dashboard            |   3.0s    |   300ms   |    0.1     | Bigger lift on logged-in pages; users tolerate. |
| Documentation             |   2.0s    |   200ms   |    0.05    | Should be very fast. |
| Marketing landing         |   2.5s    |   200ms   |    0.1     | CWV "good" - affects SEO. |

Start at the CWV "good" thresholds (Step 1); tighten where the
team has competitive / SEO motivation.

## §7 - Mobile-specific anti-patterns

| Anti-pattern                                                         | Why it hurts mobile                                                       | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hero image 2 MB unoptimized                                          | Dominates LCP; 4G/3G users wait 5+ seconds.                              | Responsive images (`srcset`); WebP/AVIF; <300 KB. |
| Web fonts blocking text render                                        | FOIT/FOUT triggers CLS; LCP drifts.                                       | `font-display: swap` + preload critical fonts. |
| Render-blocking CSS for below-fold styles                             | LCP delayed.                                                              | Critical CSS inlined; rest deferred. |
| Heavy JS hydration on mobile CPU                                       | INP balloons; user taps don't respond.                                   | Code-split per route; lazy-load non-critical components. |
| Layout shifts after fonts/images load                                  | CLS exceeds 0.1; reflows annoy users.                                    | Reserve space (`width`/`height` attributes; `aspect-ratio`). |
| Third-party tags blocking main thread                                  | Analytics / chat / consent banners delay LCP and INP.                    | Async / defer; load after first paint. |
| Mobile-only quick-fixes that miss desktop                              | Optimizing only one viewport; the other regresses.                       | Per-viewport budgets (Step 3). |

## §8 - Monitoring cadence

| Cadence              | Use                                                                       |
|----------------------|---------------------------------------------------------------------------|
| **Per-PR (CI gate)** | Lab measurement via Lighthouse CI; fast feedback; blocks regressions.    |
| **Per-deploy (canary)** | RUM check during canary observation; pair with [`prod-canary-validator`](../../../qa-shift-right/skills/prod-canary-validator/SKILL.md). |
| **Continuous (RUM)** | The `web-vitals` JS library reports to your analytics; field truth.       |
| **Weekly review**    | Aggregate RUM dashboard; spot trends; correlate with deploy markers.      |

## References

- [wv][wv] - Core Web Vitals: LCP / INP / CLS thresholds, 75th
  percentile + segmented mobile/desktop, INP replaced FID March 2024,
  field vs lab measurement, web-vitals JS library, Lighthouse TBT
  as INP proxy.
- [`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md) - the runner this skill's budgets feed.
- [`lighthouse-budget-author`](../../../qa-load-testing/skills/lighthouse-budget-author/SKILL.md) - sibling: per-route budget authoring.
- [`mobile-web-emulation-runner`](../mobile-web-emulation-runner/SKILL.md) - exercises the mobile profile in E2E tests.
- [`prod-canary-validator`](../../../qa-shift-right/skills/prod-canary-validator/SKILL.md) - uses Web Vitals metrics in canary verdicts.
