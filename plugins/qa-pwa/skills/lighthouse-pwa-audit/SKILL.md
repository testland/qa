---
name: lighthouse-pwa-audit
description: "Run and interpret Lighthouse PWA audits - even after the PWA *category* was deprecated per [developer.chrome.com/docs/lighthouse/pwa][lh-pwa], the individual audits (`installable-manifest`, `service-worker`, `splash-screen`, `themed-omnibox`, `viewport`, `content-width`, `apple-touch-icon`, `maskable-icon`) still run and report under a custom Lighthouse config or via direct audit invocation. Covers CLI flags (`--only-categories`, `--output`, `--form-factor`, `--throttling-method`), programmatic Node.js invocation, Lighthouse CI assertions (`categories:{id}`, `audit-id` thresholds), and LHR JSON parsing. Use when a manifest or icon change needs a precise installable-manifest verdict, or when CI must gate PRs on PWA audit scores despite the category badge being gone."
metadata:
  keywords: "lighthouse, lighthouse-ci, pwa-audit, installable-manifest, maskable-icon"
---

# lighthouse-pwa-audit

## Overview

Lighthouse is the canonical PWA audit tool. The current release line
is **v13.3.0** per [github.com/GoogleChrome/lighthouse][lh-gh]
(released May 2026). The PWA *category* itself was deprecated - per
[developer.chrome.com/docs/lighthouse/pwa][lh-pwa]: *"PWA testing in
Lighthouse is deprecated. For more information on its deprecation
see Chrome's updated Installability Criteria."* - but the individual
audits remain available and run on demand under a custom Lighthouse
config. This skill covers both running them and reading the LHR
(Lighthouse Result) JSON the audits emit.

The companion `@lhci/cli` package per
[github.com/GoogleChrome/lighthouse-ci][lhci-gh] is how the audits
gate CI: it wraps Lighthouse runs and asserts category / audit
scores per a `.lighthouserc.json` config.

[lh-pwa]: https://developer.chrome.com/docs/lighthouse/pwa
[lh-gh]: https://github.com/GoogleChrome/lighthouse
[lhci-gh]: https://github.com/GoogleChrome/lighthouse-ci
[lhci-config]: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md

## When to use

- A PWA needs a pre-release audit gate covering installability,
  service-worker registration, and the maskable-icon contract.
- A regression bisect points at a manifest / icon change and you
  need a precise installable-manifest verdict.
- CI needs to fail PRs that drop below a fixed PWA-audit threshold
  even though the category badge is deprecated.
- A site-reliability dashboard wants per-audit time-series - the
  LHR JSON is the canonical input.

## Authoring

### Step 1 - Install Lighthouse + Lighthouse CI

```bash
npm install --save-dev lighthouse @lhci/cli
# Or globally for one-off CLI use:
npm install -g lighthouse @lhci/cli
```

### Step 2 - Inventory the PWA audits

Per [lh-pwa], the audits previously grouped under the PWA category:

| Group | Audit ID | What it checks |
|---|---|---|
| Fast and reliable | `load-fast-enough-for-pwa` | "Page load speed on mobile networks" per [lh-pwa] |
| Fast and reliable | `works-offline` | "Current page responds with 200 when offline" per [lh-pwa] |
| Fast and reliable | `offline-start-url` | "`start_url` responds with 200 when offline" per [lh-pwa] |
| Installable | `is-on-https` | "HTTPS requirement" per [lh-pwa] |
| Installable | `service-worker` | "Service worker registration controlling page and start_url" per [lh-pwa] |
| Installable | `installable-manifest` | "Web app manifest installability requirements" per [lh-pwa] |
| PWA optimized | `redirects-http` | "HTTP to HTTPS redirect" per [lh-pwa] |
| PWA optimized | `splash-screen` | "Custom splash screen configuration" per [lh-pwa] |
| PWA optimized | `themed-omnibox` | "Theme color for address bar" per [lh-pwa] |
| PWA optimized | `content-width` | "Viewport sizing for content" per [lh-pwa] |
| PWA optimized | `viewport` | "Viewport meta tag presence" per [lh-pwa] |
| PWA optimized | `without-javascript` | "Fallback content without JavaScript" per [lh-pwa] |
| PWA optimized | `maskable-icon` | "Maskable icon in manifest" per [lh-pwa] |
| Manual | (manual) | "Cross-browser compatibility, network-independent page transitions, URL structure" per [lh-pwa] |

### Step 3 - Run audits from the CLI

The basic invocation per [lh-gh]:

```bash
lighthouse https://localhost:3000 \
  --output=json \
  --output-path=./lhr.json \
  --form-factor=mobile \
  --throttling-method=simulate \
  --chrome-flags="--headless --window-size=412,660"
```

CLI flags from [lh-gh]:

| Flag | Effect |
|---|---|
| `--output json` / `--output html` | Output format(s); can pass multiple |
| `--output-path=./lhr.json` | Write to file (stdout by default) |
| `--only-categories=pwa` | Restrict to category (still accepted even with PWA deprecated) |
| `--only-audits=installable-manifest,service-worker` | Restrict to specific audits |
| `--form-factor=mobile` / `desktop` | Device emulation |
| `--throttling-method=devtools` / `simulate` / `provided` | Network/CPU throttling mode |
| `--chrome-flags="..."` | Pass-through to Chrome launcher |

To restrict to the still-supported audits without invoking the
deprecated category, list the audit IDs directly:

```bash
lighthouse https://localhost:3000 \
  --only-audits=installable-manifest,service-worker,maskable-icon,viewport,themed-omnibox,splash-screen,content-width,apple-touch-icon,is-on-https \
  --output=json \
  --output-path=./lhr.json
```

### Step 4 - Author a Lighthouse CI config

Create `.lighthouserc.json` per [lhci-config]:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 3,
      "settings": {
        "onlyAudits": [
          "installable-manifest",
          "service-worker",
          "maskable-icon",
          "viewport",
          "themed-omnibox",
          "splash-screen",
          "content-width",
          "apple-touch-icon",
          "is-on-https"
        ],
        "throttlingMethod": "devtools"
      }
    },
    "assert": {
      "assertions": {
        "installable-manifest": ["error", { "minScore": 1 }],
        "service-worker": ["error", { "minScore": 1 }],
        "maskable-icon": ["error", { "minScore": 1 }],
        "viewport": ["error", { "minScore": 1 }],
        "is-on-https": ["error", { "minScore": 1 }],
        "themed-omnibox": ["warn", { "minScore": 1 }],
        "splash-screen": ["warn", { "minScore": 1 }],
        "content-width": ["warn", { "minScore": 1 }],
        "apple-touch-icon": ["warn", { "minScore": 1 }]
      },
      "aggregationMethod": "median-run"
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Per [lhci-config], the assertion shape is
`"<audit-id-or-categories:<id>>": [severity, { minScore | maxNumericValue | ... }]`
with `severity` one of `off`, `warn`, `error`. The "error" path
fails the build; "warn" surfaces a warning without failing.

The `aggregationMethod` per [lhci-config] supports `median`,
`optimistic`, `pessimistic`, `median-run` - `median-run` "represents
the most typical run" and is the right choice for noisy mobile
PWA audits.

### Step 5 - Programmatic invocation from Node.js

For per-test invocation outside Lighthouse CI:

```ts
// tests/lighthouse-pwa.spec.ts
import { test, expect } from 'vitest';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

test('PWA audits pass on the build', async () => {
  const chrome = await launch({ chromeFlags: ['--headless'] });
  try {
    const { lhr } = await lighthouse(
      'http://localhost:3000/',
      {
        port: chrome.port,
        output: 'json',
        onlyAudits: [
          'installable-manifest',
          'service-worker',
          'maskable-icon',
          'viewport',
          'is-on-https',
        ],
        formFactor: 'mobile',
        throttlingMethod: 'devtools',
      } as any
    );

    for (const id of [
      'installable-manifest',
      'service-worker',
      'maskable-icon',
      'viewport',
      'is-on-https',
    ]) {
      expect(lhr.audits[id].score).toBe(1);
    }
  } finally {
    await chrome.kill();
  }
});
```

The `lighthouse` npm export returns a Promise resolving to
`{ lhr, report, artifacts }`. The LHR is the parsed JSON; `report`
is the rendered HTML (when requested).

## Running

### Local one-off run

```bash
# Smoke
lighthouse https://localhost:3000/ \
  --only-audits=installable-manifest,service-worker,maskable-icon \
  --output=html --output-path=./pwa-smoke.html
open pwa-smoke.html
```

### Lighthouse CI autorun

```bash
npm install -g @lhci/cli@0.15.x
lhci autorun
```

`lhci autorun` per [lhci-gh] is the umbrella command that
"orchestrates the workflow" - it sequences `lhci collect` →
`lhci assert` → `lhci upload`.

### CI (GitHub Actions)

Per [lhci-gh]:

```yaml
name: CI
on: [push]
jobs:
  lighthouseci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install && npm install -g @lhci/cli@0.15.x
      - run: npm run build
      - run: lhci autorun
```

## Parsing results

The LHR (Lighthouse Result) JSON is the canonical machine-readable
output. Key paths:

| Path | What it holds |
|---|---|
| `lhr.audits.<audit-id>.score` | 0..1 (or `null` if not applicable); `1` = pass |
| `lhr.audits.<audit-id>.displayValue` | Human-readable summary string |
| `lhr.audits.<audit-id>.details` | Per-audit details object (table / list shape varies) |
| `lhr.audits.<audit-id>.scoreDisplayMode` | `numeric`, `binary`, `informative`, `manual`, `notApplicable`, `error` |
| `lhr.categories.<cat-id>.score` | Aggregate category score 0..1 (PWA category present but deprecated per [lh-pwa]) |
| `lhr.runWarnings` | Array of run-time warnings the audit emitted |
| `lhr.lighthouseVersion` | Which Lighthouse version produced this LHR |

Per [lh-gh] (release v13.3.0), the LHR schema is stable across
patch releases; major releases may add / remove audits. Pin the
Lighthouse version in CI for stable assertions.

For the `installable-manifest` audit specifically, the `details`
field contains a list of failing requirements (e.g. "Manifest does
not have a maskable icon", "Page does not work offline"). A
failed-audit triage step is:

```ts
const a = lhr.audits['installable-manifest'];
if (a.score !== 1) {
  console.log('installable-manifest failures:');
  for (const item of a.details?.items ?? []) {
    console.log('  -', item.failureReason || item.message || JSON.stringify(item));
  }
}
```

## CI integration

For projects that ship a PWA: gate PRs on the still-supported
install audits as a baseline.

```yaml
jobs:
  pwa-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: npm install -g @lhci/cli@0.15.x
      - run: lhci autorun
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: lhr-failure
          path: .lighthouseci/
```

The upload-artifact-on-failure step is essential - `lhci`'s default
output is a temporary-public-storage URL that disappears after the
job retention window. Persisting the `.lighthouseci/` directory
gives engineers the LHR JSON to triage offline.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assert `categories:pwa` minScore in lighthouserc | The PWA *category* is deprecated per [lh-pwa]; future Lighthouse majors may drop it entirely | Assert per-audit IDs in Step 4 instead |
| Run Lighthouse in default desktop form-factor against a mobile PWA | Different audits gate; `splash-screen` and `themed-omnibox` are mobile-specific per [lh-pwa] | `--form-factor=mobile` (Step 3) |
| Single Lighthouse run per CI job | Per-run variance is ±5 points; one bad run fails CI | `numberOfRuns: 3` + `aggregationMethod: median-run` per [lhci-config] (Step 4) |
| Mix Lighthouse versions across CI runs | Audit weights / IDs shift across majors; time-series breaks | Pin `@lhci/cli@<major>.<minor>` (Step 4) |
| Treat `score: null` as failing | `null` means "not applicable" per the LHR schema | Filter `score === null` before threshold check |
| Skip `--throttling-method=devtools` and use `provided` | `provided` makes Lighthouse trust whatever throttling the harness sets - usually nothing, inflating scores | `simulate` for repeatable CI; `devtools` for actual-CPU runs (Step 3) |
| Run Lighthouse against `https://localhost:3000` with self-signed cert | Lighthouse rejects; LHR contains `runtimeError` | Pass `--chrome-flags="--ignore-certificate-errors"` or run on plain HTTP locally |

## Limitations

- **The PWA category is deprecated** per [lh-pwa]; the individual
  audits work but the aggregate category badge is no longer
  surfaced in Chrome DevTools UI. Asserting per-audit (Step 4) is
  the forward-compatible posture.
- **`load-fast-enough-for-pwa` and `works-offline`** scores depend
  on the network throttling profile; cross-environment comparisons
  require pinning `--throttling-method` and `--form-factor`.
- **Per-run variance.** Even with `median-run` aggregation, mobile
  emulation introduces ±5-point swings on perf metrics;
  `installable-manifest` and `service-worker` are binary and stable,
  but other audits drift.
- **Headless CI cannot test iOS install criteria.** Lighthouse
  drives Chromium only; the `apple-touch-icon` audit checks the
  link tag presence, not the resulting iOS install behavior. See
  [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md)
  Stage 3 for the iOS-specific path.
- **Authenticated routes** require the auth recipe from [lh-gh]
  docs - programmatic invocation with a logged-in Chrome user
  data dir, not covered by the default `lighthouse <url>` form.

## References

- Lighthouse PWA audits (deprecation notice, audit list,
  per-audit purpose statements) - [lh-pwa].
- Lighthouse repo (v13.3.0, CLI flags, `--only-categories`,
  `--throttling-method`, programmatic API) - [lh-gh].
- Lighthouse CI repo (`lhci autorun`, GitHub Actions workflow) - 
  [lhci-gh].
- Lighthouse CI config (`.lighthouserc.json` shape, preset values,
  category vs audit assertions, aggregation methods) - [lhci-config].
- Differentiation: this skill is the *audit reader*. The
  [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md)
  is the *contract* the `installable-manifest` audit checks
  against; the [`workbox-tests`](../workbox-tests/SKILL.md) skill
  covers the runtime cache behavior Lighthouse can't fully
  inspect.
- Sibling skills:
  [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md),
  [`web-push-tests`](../web-push-tests/SKILL.md),
  [`service-worker-lifecycle-tests`](../service-worker-lifecycle-tests/SKILL.md).
