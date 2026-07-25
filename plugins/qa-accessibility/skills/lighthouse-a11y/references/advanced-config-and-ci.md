# Lighthouse a11y - per-URL config, audit IDs, and CI

Deep reference for `lighthouse-a11y` SKILL.md. Consult when pages need different
score bars, when mapping a failing audit ID to what it checks, or when wiring
the audit into GitHub Actions. SKILL.md keeps the single-config first run and
points here for the rest.

[lhci]: https://github.com/GoogleChrome/lighthouse-ci

## Per-URL thresholds with assertMatrix

`assert.assertions` applies one threshold set to every collected URL. When
pages need different bars (a marketing homepage at 0.90, a checkout at 0.98),
use `assertMatrix` instead: an array where each entry pairs a
`matchingUrlPattern` (a regex matched against the audited URL) with its own
`assertions` block ([lhci]). `assertMatrix` and `assertions` are mutually
exclusive at the `assert` level, and the first matching pattern wins, so order
specific patterns before the catch-all:

```js
// .lighthouserc.js - different a11y bars per URL
module.exports = {
  ci: {
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*/checkout.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.98 }],
            'color-contrast':           ['warn'],
          },
        },
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.90 }],
            'color-contrast':           ['warn'],
          },
        },
      ],
    },
  },
};
```

## Accessibility audit IDs

Lighthouse's accessibility category runs a curated set of axe-core rules. The
category score (0 - 1) reflects rule pass rate weighted by severity. Common
per-audit IDs (used in `assertions:`):

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

## CI integration

(See the same workflow in `lighthouse-perf` - one workflow runs both.)

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
      - uses: actions/checkout@v6
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
