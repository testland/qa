---
name: lighthouse-a11y
description: "Configures Lighthouse CI's Accessibility category - `categories:accessibility` audits backed by axe-core - with per-URL minimum-score assertions and per-audit overrides, distinct from the Performance category that `lighthouse-perf` covers. Use when the project already runs Lighthouse CI for Web Vitals and the team wants to add a11y coverage in the same pipeline rather than spinning up a separate scanner."
---

# lighthouse-a11y

## Overview

Lighthouse CI ships five audit categories: Performance, Accessibility,
Best Practices, SEO, and Progressive Web App. The **Accessibility**
category runs a curated subset of axe-core rules
([lhci][lhci]). Configuring it via the same `lighthouserc.js` that
`lighthouse-perf`
uses keeps the audit pipeline unified.

[lhci]: https://github.com/GoogleChrome/lighthouse-ci

This skill is **the a11y slice** of Lighthouse CI;
`lighthouse-perf`
is the Web Vitals slice. Both consume the same config; one CI run
produces both reports.

## When to use

- The project already uses Lighthouse CI for performance.
- The team wants a single tool reporting both perf and a11y.
- Coverage at the **page level** is sufficient (Lighthouse runs
  against full URLs; for component-level coverage, use
  `axe-a11y` in unit/integration tests).
- The team wants the Lighthouse score-style summary
  (e.g. "Accessibility: 92 / 100") rather than per-rule violation
  counts.

If the project doesn't already use Lighthouse CI, prefer
`axe-a11y` directly - Lighthouse adds a
layer.

## How to use

1. Confirm the project already runs Lighthouse CI (see When to use); if not, prefer `axe-a11y` directly.
2. Install the CLI (`npm install --save-dev @lhci/cli`).
3. Add the accessibility assertions to `.lighthouserc.js` alongside any perf assertions - the `categories:accessibility` category score plus per-audit overrides on critical rules (Worked example).
4. Run `npx lhci autorun` to collect, assert, and upload in one pass.
5. Gate CI on the assertions and tighten `minScore` over time - per-URL thresholds, the full audit-ID reference, and the GitHub Actions workflow live in [references/advanced-config-and-ci.md](references/advanced-config-and-ci.md).

## Install

(Same as `lighthouse-perf`.)

```bash
npm install --save-dev @lhci/cli
```

(Per [lhci][lhci].)

## Worked example

Add the a11y assertions to the same `.lighthouserc.js` that
`lighthouse-perf`
uses for Web Vitals, so one config drives both categories:

```js
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/checkout',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        // Performance
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1 }],

        // Accessibility - category score (0-1)
        'categories:accessibility':  ['error', { minScore: 0.95 }],

        // Per-audit overrides - error on critical-impact a11y rules
        'aria-required-attr':         ['error', { minScore: 1 }],
        'button-name':                ['error', { minScore: 1 }],
        'label':                      ['error', { minScore: 1 }],
        'meta-viewport':              ['error', { minScore: 1 }],

        // Lower-impact a11y rules - warn but don't block
        'color-contrast':             ['warn',  { minScore: 1 }],
        'image-alt':                  ['warn',  { minScore: 1 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

Per [lhci][lhci], assertion levels are `'error'` (CI fails),
`'warn'` (surfaced but doesn't fail), and `'off'` (disabled).

Then run all three phases (collect / assert / upload) in one pass:

```bash
npx lhci autorun
```

Per [lhci][lhci], the same command and flags (`--collect.url`, etc.) serve both
perf and a11y assertions. The **Accessibility** category score (0 - 1) reflects
axe-rule pass rate weighted by severity. **A score of 1.0 doesn't mean perfect
a11y** - manual testing per
`screen-reader-test-author`
remains essential, so assert specific audit IDs (`button-name`, `label`, ...) in
addition to the category score. The full audit-ID reference, per-URL thresholds
via `assertMatrix`, and the CI workflow live in
[references/advanced-config-and-ci.md](references/advanced-config-and-ci.md).

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Asserting only the category score                              | A score of 1.0 hides per-rule details; can't pinpoint regressions. | Assert specific audit IDs in addition to the category score. |
| Setting `categories:accessibility minScore: 1`                  | Strict; a single moderate-severity rule failure blocks every PR.   | Start with `minScore: 0.95`; tighten over time. |
| Running only on the homepage                                   | Most a11y bugs live on form-heavy / dynamic pages.                  | Audit a representative URL set. |
| Disabling the a11y category to "fix later"                      | "Later" never arrives.                                              | Use `a11y-violation-gate` ratchet pattern. |
| Treating Lighthouse score as the gold standard                  | Lighthouse covers ~50-60% of WCAG; doesn't catch ARIA misuse, screen-reader issues, keyboard-only flow bugs. | Pair with manual testing + dedicated `axe-a11y` component scans. |

## Limitations

- **Page-level only.** Lighthouse audits whole pages; per-component
  coverage isn't supported. Use `axe-a11y`
  in unit/integration tests for component-level.
- **Subset of axe rules.** Lighthouse's accessibility category
  doesn't run every axe rule; for complete axe coverage, use
  `axe-a11y` directly.
- **Throttled environment.** Lighthouse simulates throttled
  network/CPU; some a11y issues only manifest at production
  speeds (rare but real). Confirm with a non-throttled scan if
  suspicious.

## References

- [lhci][lhci] - Lighthouse CI install, `lhci autorun`,
  configuration shape, assertion levels.
- Per-URL `assertMatrix` thresholds, the full accessibility audit-ID table, and
  the GitHub Actions workflow:
  [references/advanced-config-and-ci.md](references/advanced-config-and-ci.md).
- `lighthouse-perf` - sibling skill for the Performance / Web Vitals category in
  the same Lighthouse run.
- `axe-a11y` - direct axe-core usage for
  component-level coverage.
- `a11y-violation-gate` - CI
  gate consuming Lighthouse a11y output.
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
