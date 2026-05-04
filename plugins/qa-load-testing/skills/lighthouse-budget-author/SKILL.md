---
name: lighthouse-budget-author
description: Drafts a `lighthouserc.js` (or `budget.json`) at design time — picks Web Vitals thresholds (LCP / INP / CLS) per route based on traffic class (cached / dynamic / API-heavy / form-heavy) and the team's NFRs, plus resource-size budgets (JS / CSS / images / total bytes). Emits the config file ready for the lighthouse-perf runner. Use when starting Lighthouse coverage on a project that has no budgets yet, or when the existing budgets need a redesign.
rating: 24
d6: 4
archetype: S3
---

# lighthouse-budget-author

## Overview

[`lighthouse-perf`](../lighthouse-perf/SKILL.md) is the runner — it
takes a `.lighthouserc.js` and runs Lighthouse against it. **This
skill writes the config**, picking thresholds per route at design
time so the runner has something meaningful to assert against.

The two artifacts this skill produces:

1. **Lighthouse CI assertion config** in `.lighthouserc.js` —
   per-route LCP / INP / CLS thresholds.
2. **Resource-size budget** in `budget.json` (the Lighthouse
   "performance budgets" feature) — per-resource-type byte caps.

Without this skill, teams either (a) set every threshold to the
"good" default and ignore route-specific reality, or (b) pick
thresholds via guesswork. Either ends with a gate the team disables.

## When to use

- The project just installed `@lhci/cli` and needs an initial
  config.
- An NFR review (per
  [`nfr-extractor`](../../qa-shift-left/skills/nfr-extractor/SKILL.md))
  produced perf NFRs that need to translate into Lighthouse syntax.
- Existing budgets are uniform across routes (same threshold for
  every URL); the team wants per-route tightening.
- The team wants resource-size budgets (JS bundle ≤ 300kb, etc.)
  in addition to Web Vitals.

## Step 1 — Inventory the routes

For each route to be audited:

| Field             | Notes                                                |
|-------------------|------------------------------------------------------|
| URL pattern       | The actual URL or a representative one.              |
| Traffic class     | `cached` / `dynamic` / `api-heavy` / `form-heavy` / `media-heavy`. |
| Auth state        | `public` / `logged-in` (auth state changes the JS bundle). |
| Cache TTL         | Static assets duration.                              |
| User-tier traffic | What % of traffic does this route account for? Drives strictness. |

The URL set should cover the team's high-traffic routes plus any
known-slow long-tail page. Don't audit every URL — pick
representatives.

## Step 2 — Pick LCP / INP / CLS thresholds per route

Start from the canonical Web Vitals "good" thresholds (LCP ≤2.5s,
INP ≤200ms, CLS ≤0.1) and adjust per traffic class:

| Traffic class    | LCP target  | INP target | CLS target | Reasoning                                           |
|------------------|-------------|------------|------------|-----------------------------------------------------|
| **Cached** (CDN-served, mostly static) | ≤1.5s | ≤100ms | ≤0.1 | The default is too lenient; cached pages should be fast. |
| **Dynamic** (per-user content)         | ≤2.5s | ≤200ms | ≤0.1 | Default thresholds. |
| **API-heavy** (waterfall of fetches)   | ≤3.0s | ≤200ms | ≤0.1 | Acknowledge real-world latency; tighten elsewhere.  |
| **Form-heavy** (input + validation)    | ≤2.5s | ≤100ms | ≤0.05 | INP matters more — every keystroke is an interaction. CLS strict because forms must not jump. |
| **Media-heavy** (images / video)       | ≤2.5s | ≤200ms | ≤0.1 | LCP via priority hints + `loading=eager` on hero. |

For a team's first pass, **start lenient** (Web Vitals defaults
across the board) and **tighten one route at a time** as evidence
accumulates that the route is consistently faster than the default.

## Step 3 — Pick resource-size budgets

A resource-size budget caps the total bytes per resource type. The
canonical Lighthouse "good" defaults for a non-media-heavy public
page:

| Resource type | Suggested budget | Notes |
|---------------|------------------|-------|
| `script`      | 300 kb           | Compressed JS bundle (gzip / brotli). Tighten to 150kb for marketing pages. |
| `stylesheet`  | 100 kb           | CSS only. Most projects fit easily. |
| `image`       | 500 kb           | Per page — adjust upward for media-heavy. |
| `font`        | 100 kb           | Subset fonts; use variable fonts when possible. |
| `total`       | 1500 kb          | Page total; CDN-cached or not.              |

For Single-Page Apps where the JS bundle is the load-bearing cost,
the JS budget is the most important. Subpaths (route chunks) keep
this tractable as the app grows.

## Step 4 — Emit `lighthouserc.js`

A representative config that lives at the project root:

```js
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',                      // marketing home (cached)
        'http://localhost:3000/pricing',               // marketing pricing (cached)
        'http://localhost:3000/dashboard',             // logged-in dynamic
        'http://localhost:3000/orders/new',            // form-heavy
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
        budgetPath: './budget.json',                  // resource-size budget
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
    },
    assert: {
      assertMatrix: [
        // Cached marketing pages — strict
        {
          matchingUrlPattern: '^http://[^/]+/(pricing)?$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 100 }],
            'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1 }],
          },
        },
        // Dynamic logged-in pages — defaults
        {
          matchingUrlPattern: '/dashboard',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1 }],
          },
        },
        // Form-heavy pages — strict CLS
        {
          matchingUrlPattern: '/orders/new',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 100 }],
            'cumulative-layout-shift':   ['error', { maxNumericValue: 0.05 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

`assertMatrix` lets per-route assertions live in one config — easier
to review than separate config files.

## Step 5 — Emit `budget.json`

Lighthouse's resource-size budget format:

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script",     "budget": 300 },
      { "resourceType": "stylesheet", "budget": 100 },
      { "resourceType": "image",      "budget": 500 },
      { "resourceType": "font",       "budget": 100 },
      { "resourceType": "total",      "budget": 1500 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  },
  {
    "path": "/marketing/*",
    "resourceSizes": [
      { "resourceType": "script",     "budget": 150 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "total",      "budget": 800 }
    ]
  }
]
```

Per-path budgets allow stricter targets for marketing pages (where
load time directly impacts conversion) than for logged-in app
routes.

## Step 6 — Validate the budget realistically

Before committing, run Lighthouse against current production with
the new config:

```bash
LHCI_BUILD_CONTEXT__GITHUB_BASE_URL=... npx lhci collect --url=https://prod.example.com/
npx lhci assert
```

Expect **some failures** — that's the point. The budget surfaces what
needs work. Categorize the failures:

| Failure kind          | Decision                                              |
|-----------------------|-------------------------------------------------------|
| Single-route outlier  | File a perf-improvement ticket; relax the budget on this route only with a TODO. |
| Universal failure     | The budget is too strict; relax to current p75 + 10%. |
| Budget violated only on mobile preset | Add a separate `lighthouserc.mobile.js` with looser mobile budgets. |

Never set a budget that **always passes today** — it'll never catch
a regression.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                                | Fix |
|-------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| Same threshold for every route                              | Cached marketing page passes the same gate as a logged-in dashboard.       | Use `assertMatrix` with per-route patterns. |
| Threshold = current production value                        | No room for a real regression to be caught.                                  | Set threshold = current + 10% headroom; tighten over time. |
| Budgets in one mega-file with no per-path scope             | Strict marketing budget falsely fails the dashboard.                         | Per-path budget objects. |
| Setting the threshold to the "Good" target on day one       | Most production sites don't meet the targets out of the box; team disables the gate. | Land the gate at current production levels first; tighten the budget as a separate task. |
| Skipping the resource-size budget                           | Web Vitals catch the symptom (slow LCP); resource-size catches the cause (JS bundle bloat). | Both. They're complementary. |

## References

- [`lighthouse-perf`](../lighthouse-perf/SKILL.md) — the runner that
  consumes this skill's output.
- [`nfr-extractor`](../../qa-shift-left/skills/nfr-extractor/SKILL.md)
  — upstream skill that produces threshold-bound NFRs translated by
  this skill into Lighthouse syntax.
- [`perf-budget-gate`](../perf-budget-gate/SKILL.md) — downstream
  unified gate that consumes Lighthouse + load-runner verdicts.
- web.dev/articles/vitals — canonical LCP / INP / CLS thresholds at
  the 75th percentile.
- Lighthouse performance budgets — https://web.dev/articles/use-lighthouse-for-performance-budgets
