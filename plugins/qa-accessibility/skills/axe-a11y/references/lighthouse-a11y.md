# Lighthouse CI Accessibility category

Companion reference for `axe-a11y`. Consult when the project already runs
Lighthouse CI for Web Vitals and wants a11y coverage in the same pipeline
instead of a separate scanner. If the project doesn't already use Lighthouse
CI, prefer direct axe integration (SKILL.md) - Lighthouse adds a layer.

Lighthouse CI ships five audit categories: Performance, Accessibility, Best
Practices, SEO, and Progressive Web App. The **Accessibility** category runs
a curated subset of axe-core rules ([lhci][lhci]). It audits whole pages
(scored 0 - 1, rule pass rate weighted by severity); for component-level
coverage, use axe in unit / integration tests.

[lhci]: https://github.com/GoogleChrome/lighthouse-ci

## Install and configure

```bash
npm install --save-dev @lhci/cli
```

Add a11y assertions to the same `.lighthouserc.js` used for perf, so one
config drives both categories:

```js
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/checkout'],
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        // Accessibility - category score (0-1)
        'categories:accessibility':  ['error', { minScore: 0.95 }],

        // Per-audit overrides - error on critical-impact a11y rules
        'aria-required-attr':         ['error', { minScore: 1 }],
        'button-name':                ['error', { minScore: 1 }],
        'label':                      ['error', { minScore: 1 }],
        'meta-viewport':              ['error', { minScore: 1 }],

        // Lower-impact rules - warn but don't block
        'color-contrast':             ['warn',  { minScore: 1 }],
        'image-alt':                  ['warn',  { minScore: 1 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

Per [lhci][lhci], assertion levels are `'error'` (CI fails), `'warn'`
(surfaced but doesn't fail), and `'off'`. Run all three phases (collect /
assert / upload) with `npx lhci autorun`.

## Per-URL thresholds with assertMatrix

`assert.assertions` applies one threshold set to every collected URL. When
pages need different bars, use `assertMatrix`: an array pairing a
`matchingUrlPattern` regex with its own `assertions` block ([lhci]).
`assertMatrix` and `assertions` are mutually exclusive at the `assert` level,
and the first matching pattern wins - order specific patterns before the
catch-all:

```js
assert: {
  assertMatrix: [
    { matchingUrlPattern: '.*/checkout.*',
      assertions: { 'categories:accessibility': ['error', { minScore: 0.98 }] } },
    { matchingUrlPattern: '.*',
      assertions: { 'categories:accessibility': ['error', { minScore: 0.90 }] } },
  ],
},
```

## Common accessibility audit IDs

Used in `assertions:`; per [lhci][lhci] (full list in Lighthouse's
accessibility audit documentation):

| Audit ID                 | What it checks                                          |
|--------------------------|---------------------------------------------------------|
| `aria-allowed-attr`      | ARIA attributes are valid for the element's role.       |
| `aria-required-attr`     | Required ARIA attributes for the role are present.      |
| `aria-roles`             | Valid ARIA roles only.                                  |
| `aria-valid-attr-value`  | ARIA attribute values are valid.                        |
| `button-name`            | Buttons have accessible names.                          |
| `bypass`                 | Skip-link or landmark for bypassing repeated content.   |
| `color-contrast`         | Foreground / background contrast >= 4.5:1 (3:1 large).  |
| `document-title`         | `<title>` is set.                                       |
| `frame-title`            | `<iframe>` has a `title` attribute.                     |
| `html-has-lang`          | `<html>` has `lang`.                                    |
| `image-alt`              | `<img>` has `alt`.                                      |
| `label`                  | Form fields have associated labels.                     |
| `link-name`              | Links have accessible names.                            |
| `meta-viewport`          | `<meta name="viewport">` doesn't disable zoom.          |
| `tabindex`               | No `tabindex > 0`.                                      |

## CI integration

```yaml
# .github/workflows/lighthouse.yml
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

## Anti-patterns and limits

- **Asserting only the category score** hides per-rule regressions - assert
  specific audit IDs in addition to the score.
- **`minScore: 1` on the category** blocks every PR on a single
  moderate-severity failure; start at 0.95 and tighten.
- **A score of 1.0 doesn't mean perfect a11y** - Lighthouse runs a subset of
  axe rules and covers ~50-60% of WCAG; pair with manual testing
  (`screen-reader-test-author`) and direct axe scans.
- **Page-level only** - per-component coverage isn't supported.

## References

- Lighthouse CI - [lhci][lhci] (install, `lhci autorun`, config shape,
  assertion levels, `assertMatrix`).
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
