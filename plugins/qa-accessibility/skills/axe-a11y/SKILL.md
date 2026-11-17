---
name: axe-a11y
description: "Use for any request to check accessibility automatically, including adding a scan to an existing Playwright, Cypress or unit test, or stopping missing labels and contrast errors from shipping: axe-core via axe.run(), @axe-core/playwright or the CLI on every PR, rule configuration and CI-gateable results, plus pa11y, Lighthouse CI, WAVE and IBM Equal Access in its references."
---

# axe-a11y

## Overview

axe-core is "an accessibility testing engine for websites and other
HTML-based user interfaces" maintained by Deque
([axe-core][readme]). It identifies approximately **57% of WCAG
issues automatically** and flags items requiring human review as
"incomplete" ([axe-core][readme]).

[readme]: https://github.com/dequelabs/axe-core
[axepw]: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md
[axepwsrc]: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/src/index.ts
[axeapi]: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
[axerules]: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md

The integration shape: load the engine into a page (via test
fixture, browser extension, or framework adapter), call
`axe.run()`, and parse the `violations[]` array.

## When to use

- The project ships JavaScript / TypeScript UI tests
  (Playwright / Cypress / Jest / Vitest).
- Automated a11y coverage on every PR is a goal.
- The team values **WCAG SC tagging** - axe rules map cleanly to
  WCAG 2.0 / 2.1 / 2.2 SCs.
- Pair with `a11y-violation-gate`
  for the ratchet pattern over baseline.

If axe-core's direct integration doesn't fit, route to the other
scanners below.

## Other scanners

axe-core is the primary engine; four alternatives live in references/,
each with verified install / CLI / API / CI patterns:

| Scanner | Reach for it when | Reference |
|---|---|---|
| pa11y (htmlcs + axe engines) | Scriptable CLI scans without a test framework; multi-URL batching via pa11y-ci. | [references/pa11y.md](references/pa11y.md) |
| Lighthouse a11y | The project already runs Lighthouse CI and wants a11y in the same pipeline. | [references/lighthouse-a11y.md](references/lighthouse-a11y.md) |
| WAVE | WebAIM-branded reports, visual overlay for designers, or third-party-site audits. | [references/wave.md](references/wave.md) |
| IBM Equal Access | US Section 508 procurement or IBM-branded enterprise compliance. | [references/ibm-equal-access.md](references/ibm-equal-access.md) |

All five emit JSON that `a11y-violation-gate` normalizes and ratchets.

## Install

```bash
npm install --save-dev axe-core
```

(Per [axe-core][readme].)

For framework integration (preferred over raw `axe.run()`):

| Package                      | When to use                               |
|------------------------------|-------------------------------------------|
| `@axe-core/playwright`       | Playwright tests.                         |
| `@axe-core/react`            | React-component scans during rendering.   |
| `@axe-core/cli`              | Headless CLI for arbitrary URLs.          |
| `axe-core/api/install` (raw) | Custom integrations.                      |

## Authoring scans

### Raw `axe.run()` API

```javascript
import axe from 'axe-core';

axe.run()
  .then(results => {
    if (results.violations.length) {
      console.error('a11y violations:', results.violations);
    }
  })
  .catch(err => {
    console.error('axe error:', err.message);
  });
```

(Adapted from [axe-core][readme].)

For test environments where loading axe via `<script>` is easier:

```html
<script src="node_modules/axe-core/axe.min.js"></script>
```

### Playwright integration

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout page passes axe scan', async ({ page }) => {
  await page.goto('/checkout');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])   // WCAG 2.2 A + AA
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Traps that silently shrink a scan

A green axe test can mean "axe looked at less than you think". Check
these before trusting one.

**AxeBuilder calls overwrite each other** (from the
[@axe-core/playwright source][axepwsrc]):

- `withTags()` and `withRules()` both set `runOnly`; the last call wins,
  so `.withTags([...]).withRules(['region'])` runs only `region`.
- `disableRules()` starts a fresh `rules` map on every call, so calling
  it in a loop keeps only the last rule disabled.
- `options(obj)` replaces the whole options object, wiping every
  `withTags`, `withRules` and `disableRules` call made before it.

To scan a tag set plus extra rules minus skipped ones, build one options
object. Per the [axe API][axeapi], "By combining runOnly with type: tags
and the rules option, a modified set can be defined":

```typescript
const results = await new AxeBuilder({ page })
  .options({
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: {
      region: { enabled: true },             // best-practice rules added on top
      'frame-tested': { enabled: true },
      'color-contrast': { enabled: false },  // skipped: reason + review date
    },
  })
  .analyze();
```

Guard the helper itself: one test that scans a fixture page with a
known problem (a missing label, content outside landmarks) and expects
that rule in `violations`. A future chain-order mistake then fails a
test instead of quietly shrinking every scan.

**Frames.** [@axe-core/playwright][axepw] "automatically injects into
all frames", including cross-origin ones such as a payment provider's
card form. Injecting `axe-core` with `page.addScriptTag` and calling
`axe.run` in `page.evaluate` runs in the top document only; axe cannot
enter a cross-origin frame that has no axe loaded. The `frame-tested`
rule reports frames that were not tested, but it is tagged
`best-practice` ([rule list][axerules]), so a WCAG-only `runOnly` drops
it. Enable it next to the tags (above) and fail on it. `setLegacyMode()`
turns cross-origin frame testing off; use it only as a last resort.

**`resultTypes` truncates everything you did not list.** Per the
[axe API][axeapi], types not listed "will cause rules that fall under
one of the missing types to show a maximum of one node". With
`resultTypes: ['violations']` the `incomplete` list has at most one
element per rule, so a manual review queue built from it is short.
Drop the option or list `'incomplete'` too.

**Gate on violations, route `incomplete` to review.** Fail the test on
`violations` with a readable message (rule id, impact, targets), and
write `incomplete` (the needs-review items, such as contrast over
images) to a review file without failing. Things axe cannot decide at
all, such as whether an error message is announced, stay on the manual
screen-reader checklist (`screen-reader-test-author`).

### Cypress integration

```javascript
// cypress/support/commands.js
import 'cypress-axe';

// In a test
cy.visit('/checkout');
cy.injectAxe();
cy.checkA11y();
```

## How to use

1. Install `axe-core` plus the framework wrapper (`@axe-core/playwright`
   for Playwright; `cypress-axe` for Cypress).
2. Add one scan test per page or flow, and drive the page into the
   state you want scanned first (open modals, expand menus, submit
   forms) before calling axe.
3. Pin the conformance target with `.withTags([...])` (e.g. `wcag2a`,
   `wcag2aa`, `wcag22aa`), then `.analyze()`.
4. Suppress known false positives narrowly with `.disableRules([...])`
   or `.exclude(selector)`, each with an inline reason.
5. Persist the raw `accessibilityScanResults` JSON as a CI artifact.
6. Feed that JSON to `a11y-violation-gate` for the ratchet gate instead
   of asserting `violations.length === 0`.
7. Route `incomplete` items to periodic manual screen-reader review
   (per `screen-reader-test-author`).

## Results structure and rule configuration

`axe.run()` resolves to `violations` / `incomplete` / `passes` /
`inapplicable` arrays; each violation carries `id`, `impact`, `tags`,
and a `nodes[]` array of failing selectors. Rules are selected by WCAG
tag (`withTags`) and suppressed by rule id or selector (`disableRules`
/ `exclude`). Full field tables, tag sets, and `jq` triage:
[references/results-and-config.md](references/results-and-config.md).

## Worked example

A Playwright suite adds `checkout.a11y.spec.ts`. The test navigates to
`/checkout`, runs
`new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()`,
and writes the result JSON to `axe-results.json`.

The run returns one entry in `violations[]`: `id: color-contrast`,
`impact: serious`, tags including `wcag2aa`, and one node targeting
`button.primary` with a `failureSummary`.

`jq -r '.violations[] | "\(.impact): \(.id)"' axe-results.json` prints
`serious: color-contrast`. Piping the JSON to `a11y-violation-gate`
compares it against the baseline: because this rule/selector pair is
new, the gate fails the PR with the failing selector attributed. Fixing
the button's foreground colour clears it, and the next run reports
`violations: []`.

## CI integration

```yaml
# .github/workflows/a11y.yml
name: a11y

on:
  pull_request:
  push:
    branches: [main]

jobs:
  axe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run a11y tests
        run: npx playwright test tests/a11y/

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-results
          path: playwright-report/
          retention-days: 14
```

For richer reporting, persist the raw `accessibilityScanResults`
JSON as a build artifact and pipe to
`a11y-violation-gate`.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Asserting `violations.length === 0`                            | Existing legacy debt blocks every PR.                              | Use the ratchet pattern via `a11y-violation-gate`. |
| Disabling rules without comment in code                         | Reviewer can't tell which rules are intentionally off vs. forgotten. | Inline comment explaining why; quarterly review. |
| Scanning only the homepage                                      | Most a11y bugs hide in less-traveled flows.                       | Scan a representative URL set: home + 1 logged-in dashboard + 1 form-heavy + 1 long-content. |
| Running axe in production                                       | Performance overhead; possible info leak via verbose error logging. | CI / staging only. |
| Treating `incomplete` as `pass`                                 | Items needing human review go unreviewed; defects escape.         | Track `incomplete` separately; manual review per quarter. |
| Chaining `withTags` + `withRules`, `disableRules` in a loop, or `options()` last | Each call overwrites the earlier ones; the scan runs a different rule set than the code reads. | One options object with `runOnly` + `rules` (Traps section). |
| `addScriptTag` + `axe.run` on a page with cross-origin iframes | Frame content is never scanned; the test stays green. | `AxeBuilder`, plus `frame-tested` enabled and failing. |
| `resultTypes: ['violations']` with a review export of `incomplete` | Every other type is capped at one node per rule. | Drop `resultTypes` or include `'incomplete'`. |
| One mega-test that runs axe across every page                   | One failure = whole test fails; remediation hard.                 | One axe test per page; failure attribution clear. |

## Limitations

- **Catches ~57% of WCAG issues** ([axe-core][readme]) - the rest
  require manual screen-reader testing
  (per `screen-reader-test-author`).
- **Rule false positives.** Rare but real; `disableRules` /
  `exclude` are escape hatches with documented rationale.
- **Doesn't cover dynamic state changes well.** A modal that
  opens after user interaction won't be scanned unless the test
  triggers the open before calling `axe.run()`.

## References

- [axe-core][readme] - main repo: install, `axe.run()`, results
  structure.
- [references/results-and-config.md](references/results-and-config.md) -
  results arrays, violation fields, tag sets, disable / exclude.
- Deque rule documentation - https://dequeuniversity.com/rules/axe/
- [axepw][axepw] - @axe-core/playwright: injects into all frames, `setLegacyMode`
  and `frame-tested`.
- [axepwsrc][axepwsrc] - AxeBuilder source: `withTags` / `withRules` set `runOnly`,
  `disableRules` resets `rules`, `options` replaces the object.
- [axeapi][axeapi] - axe API: `runOnly` with `rules`, `resultTypes`, `iframes`.
- [axerules][axerules] - rule list with tags (`frame-tested`, `region` are best-practice).
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- `a11y-violation-gate` - 
  CI gate using axe results.
- Alternative scanners:
  [references/pa11y.md](references/pa11y.md),
  [references/lighthouse-a11y.md](references/lighthouse-a11y.md),
  [references/wave.md](references/wave.md),
  [references/ibm-equal-access.md](references/ibm-equal-access.md).
