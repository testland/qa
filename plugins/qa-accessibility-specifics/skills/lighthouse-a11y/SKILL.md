---
name: lighthouse-a11y
description: Configures Lighthouse CI's Accessibility category — `categories:accessibility` audits backed by axe-core — with per-URL minimum-score assertions and per-audit overrides, distinct from the Performance category that `lighthouse-perf` covers. Use when the project already runs Lighthouse CI for Web Vitals and the team wants to add a11y coverage in the same pipeline rather than spinning up a separate scanner.
rating: 25
d6: 4
archetype: S1
---

# lighthouse-a11y

## Overview

Lighthouse CI ships five audit categories: Performance, Accessibility,
Best Practices, SEO, and Progressive Web App. The **Accessibility**
category runs a curated subset of axe-core rules
([lhci][lhci]). Configuring it via the same `lighthouserc.js` that
[`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md)
uses keeps the audit pipeline unified.

[lhci]: https://github.com/GoogleChrome/lighthouse-ci

This skill is **the a11y slice** of Lighthouse CI;
[`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md)
is the Web Vitals slice. Both consume the same config; one CI run
produces both reports.

## When to use

- The project already uses Lighthouse CI for performance.
- The team wants a single tool reporting both perf and a11y.
- Coverage at the **page level** is sufficient (Lighthouse runs
  against full URLs; for component-level coverage, use
  [`axe-a11y`](../axe-a11y/SKILL.md) in unit/integration tests).
- The team wants the Lighthouse score-style summary
  (e.g. "Accessibility: 92 / 100") rather than per-rule violation
  counts.

If the project doesn't already use Lighthouse CI, prefer
[`axe-a11y`](../axe-a11y/SKILL.md) directly — Lighthouse adds a
layer.

## Install

(Same as [`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md).)

```bash
npm install --save-dev @lhci/cli
```

(Per [lhci][lhci].)

## Authoring assertions

Add the a11y assertions to `.lighthouserc.js`:

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

        // Accessibility — category score (0–1)
        'categories:accessibility':  ['error', { minScore: 0.95 }],

        // Per-audit overrides — error on critical-impact a11y rules
        'aria-required-attr':         ['error', { minScore: 1 }],
        'button-name':                ['error', { minScore: 1 }],
        'label':                      ['error', { minScore: 1 }],
        'meta-viewport':              ['error', { minScore: 1 }],

        // Lower-impact a11y rules — warn but don't block
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

## What Lighthouse a11y measures

Lighthouse's accessibility category runs a curated set of axe-core
rules. The category score (0–1) reflects rule pass rate weighted
by severity. **A score of 1.0 doesn't mean perfect a11y** — manual
testing per
[`screen-reader-test-author`](../screen-reader-test-author/SKILL.md)
remains essential.

Common per-audit IDs (used in `assertions:`):

| Audit ID                 | What it checks                                      |
|--------------------------|-----------------------------------------------------|
| `aria-allowed-attr`      | ARIA attributes are valid for the element's role.  |
| `aria-hidden-body`       | `aria-hidden` not on `<body>`.                       |
| `aria-required-attr`     | Required ARIA attributes for the role are present.  |
| `aria-required-children` | Required ARIA children are present.                  |
| `aria-roles`             | Valid ARIA roles only.                               |
| `aria-valid-attr`        | ARIA attribute names are valid.                      |
| `aria-valid-attr-value`  | ARIA attribute values are valid.                     |
| `button-name`            | Buttons have accessible names.                       |
| `bypass`                 | Skip-link or landmark for bypassing repeated content. |
| `color-contrast`         | Foreground / background contrast ≥ 4.5:1 (or 3:1 large). |
| `document-title`         | `<title>` is set.                                    |
| `duplicate-id-active`    | No duplicate `id` on focusable elements.            |
| `form-field-multiple-labels` | Form fields don't have multiple labels.        |
| `frame-title`            | `<iframe>` has a `title` attribute.                  |
| `html-has-lang`          | `<html>` has `lang`.                                  |
| `image-alt`              | `<img>` has `alt`.                                    |
| `label`                  | Form fields have associated labels.                   |
| `link-name`              | Links have accessible names.                          |
| `list`                   | `<ul>` / `<ol>` only contain `<li>`.                  |
| `listitem`               | `<li>` is inside a `<ul>` / `<ol>`.                  |
| `meta-viewport`          | `<meta name="viewport">` doesn't disable zoom.        |
| `tabindex`               | No `tabindex > 0`.                                    |
| `valid-lang`             | `lang` attribute is valid.                            |

(Per [lhci][lhci]; full list in Lighthouse's accessibility audit
documentation.)

## Running

```bash
npx lhci autorun
```

Per [lhci][lhci]; the same command runs all three phases (collect /
assert / upload) and the same flags (`--collect.url`, etc.) work
for both perf and a11y assertions.

## CI integration

(See the same workflow in
[`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md)
— one workflow runs both.)

```yaml
# .github/workflows/lighthouse.yml
name: lighthouse

on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: lighthouse-reports, path: .lighthouseci/ }
```

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Asserting only the category score                              | A score of 1.0 hides per-rule details; can't pinpoint regressions. | Assert specific audit IDs in addition to the category score. |
| Setting `categories:accessibility minScore: 1`                  | Strict; a single moderate-severity rule failure blocks every PR.   | Start with `minScore: 0.95`; tighten over time. |
| Running only on the homepage                                   | Most a11y bugs live on form-heavy / dynamic pages.                  | Audit a representative URL set. |
| Disabling the a11y category to "fix later"                      | "Later" never arrives.                                              | Use [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) ratchet pattern. |
| Treating Lighthouse score as the gold standard                  | Lighthouse covers ~50-60% of WCAG; doesn't catch ARIA misuse, screen-reader issues, keyboard-only flow bugs. | Pair with manual testing + dedicated [`axe-a11y`](../axe-a11y/SKILL.md) component scans. |

## Limitations

- **Page-level only.** Lighthouse audits whole pages; per-component
  coverage isn't supported. Use [`axe-a11y`](../axe-a11y/SKILL.md)
  in unit/integration tests for component-level.
- **Subset of axe rules.** Lighthouse's accessibility category
  doesn't run every axe rule; for complete axe coverage, use
  [`axe-a11y`](../axe-a11y/SKILL.md) directly.
- **Throttled environment.** Lighthouse simulates throttled
  network/CPU; some a11y issues only manifest at production
  speeds (rare but real). Confirm with a non-throttled scan if
  suspicious.

## References

- [lhci][lhci] — Lighthouse CI install, `lhci autorun`,
  configuration shape, assertion levels.
- [`lighthouse-perf`](../../../qa-load-testing/skills/lighthouse-perf/SKILL.md)
  — sibling skill for the Performance / Web Vitals category in
  the same Lighthouse run.
- [`axe-a11y`](../axe-a11y/SKILL.md) — direct axe-core usage for
  component-level coverage.
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) — CI
  gate consuming Lighthouse a11y output.
- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
