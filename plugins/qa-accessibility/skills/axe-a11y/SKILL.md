---
name: axe-a11y
description: "Authors and runs axe-core accessibility scans - the most-deployed open-source a11y engine - via the `axe.run()` JavaScript API or the @axe-core/playwright / @axe-core/cli wrappers, parses the `violations[]` results into per-rule severity (critical / serious / moderate / minor), configures rule disable / disable-by-tag patterns, and emits JUnit-shaped output for CI gating. Use when the project ships UI tests in JavaScript / TypeScript and wants automated a11y coverage on every PR."
---

# axe-a11y

## Overview

axe-core is "an accessibility testing engine for websites and other
HTML-based user interfaces" maintained by Deque
([axe-core][readme]). It identifies approximately **57% of WCAG
issues automatically** and flags items requiring human review as
"incomplete" ([axe-core][readme]).

[readme]: https://github.com/dequelabs/axe-core

The integration shape: load the engine into a page (via test
fixture, browser extension, or framework adapter), call
`axe.run()`, and parse the `violations[]` array.

## When to use

- The project ships JavaScript / TypeScript UI tests
  (Playwright / Cypress / Jest / Vitest).
- Automated a11y coverage on every PR is a goal.
- The team values **WCAG SC tagging** - axe rules map cleanly to
  WCAG 2.0 / 2.1 / 2.2 SCs.
- Pair with [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md)
  for the ratchet pattern over baseline.

If the team is on a non-JS stack, evaluate
[`pa11y-a11y`](../pa11y-a11y/SKILL.md) (CLI; uses axe-core
under the hood),
[`lighthouse-a11y`](../lighthouse-a11y/SKILL.md) (CI-friendly,
broader perf + a11y), or
[`ibm-equal-access-a11y`](../ibm-equal-access-a11y/SKILL.md).

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
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])     // limit to AA
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Cypress integration

```javascript
// cypress/support/commands.js
import 'cypress-axe';

// In a test
cy.visit('/checkout');
cy.injectAxe();
cy.checkA11y();
```

## Results structure

`axe.run()` resolves to an object with four arrays
([axe-core][readme]):

| Field          | Meaning                                                       |
|----------------|---------------------------------------------------------------|
| `violations`   | Definite issues - block this in CI.                          |
| `incomplete`   | Items needing human review (axe couldn't determine).        |
| `passes`       | Successful checks.                                            |
| `inapplicable` | Rules that don't apply to this page.                         |

Each violation has:

| Field          | Meaning                                                       |
|----------------|---------------------------------------------------------------|
| `id`           | Rule ID (e.g. `color-contrast`, `label`, `aria-required-attr`). |
| `impact`       | `critical` / `serious` / `moderate` / `minor`.                |
| `tags`         | Includes `wcag2a`, `wcag22aa`, etc. - for severity-by-SC tagging. |
| `description`  | One-line explanation.                                         |
| `help`         | Longer remediation guidance.                                  |
| `helpUrl`      | Direct link to Deque's rule documentation.                    |
| `nodes`        | Array of failing elements with `target` (selector), `html`, `failureSummary`. |

Triage with `jq`:

```bash
# Top violations by impact
jq -r '.violations[] | "\(.impact): \(.id) - \(.description)"' axe-results.json

# Just the failing selectors per rule
jq -r '.violations[] | "\(.id):", (.nodes[].target | tostring)' axe-results.json
```

## Rule configuration

### By tags

axe ships rules tagged with conformance levels:

```javascript
new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
```

Common tag sets:

| Tag set                                                    | Coverage                         |
|------------------------------------------------------------|----------------------------------|
| `['wcag2a', 'wcag2aa']`                                     | WCAG 2.0/2.1 A + AA. Default for most teams. |
| `['wcag2a', 'wcag2aa', 'wcag22aa']`                          | Adds WCAG 2.2 AA criteria.       |
| `['wcag2aaa']`                                              | AAA-only (rarely the gate).      |
| `['best-practice']`                                          | Non-WCAG good practices.         |
| `['experimental']`                                          | Beta rules.                      |

### Disable specific rules

```javascript
new AxeBuilder({ page }).disableRules(['color-contrast'])
```

For per-page disabling (e.g. a known false positive on a specific
component):

```javascript
new AxeBuilder({ page })
  .exclude('.legacy-component')   // selector exclusion
  .analyze();
```

For per-rule severity in CI gating (e.g. block on `critical` /
`serious` only): handle in
[`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) using
the `impact` field.

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
[`a11y-violation-gate`](../a11y-violation-gate/SKILL.md).

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Asserting `violations.length === 0`                            | Existing legacy debt blocks every PR.                              | Use the ratchet pattern via [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md). |
| Disabling rules without comment in code                         | Reviewer can't tell which rules are intentionally off vs. forgotten. | Inline comment explaining why; quarterly review. |
| Scanning only the homepage                                      | Most a11y bugs hide in less-traveled flows.                       | Scan a representative URL set: home + 1 logged-in dashboard + 1 form-heavy + 1 long-content. |
| Running axe in production                                       | Performance overhead; possible info leak via verbose error logging. | CI / staging only. |
| Treating `incomplete` as `pass`                                 | Items needing human review go unreviewed; defects escape.         | Track `incomplete` separately; manual review per quarter. |
| One mega-test that runs axe across every page                   | One failure = whole test fails; remediation hard.                 | One axe test per page; failure attribution clear. |

## Limitations

- **Catches ~57% of WCAG issues** ([axe-core][readme]) - the rest
  require manual screen-reader testing
  (per [`screen-reader-test-author`](../screen-reader-test-author/SKILL.md)).
- **Rule false positives.** Rare but real; `disableRules` /
  `exclude` are escape hatches with documented rationale.
- **Doesn't cover dynamic state changes well.** A modal that
  opens after user interaction won't be scanned unless the test
  triggers the open before calling `axe.run()`.

## References

- [axe-core][readme] - main repo: install, `axe.run()`, results
  structure.
- Deque rule documentation - https://dequeuniversity.com/rules/axe/
- @axe-core/playwright - https://github.com/dequelabs/axe-core-npm/tree/master/packages/playwright
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) - 
  CI gate using axe results.
- [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
  [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md),
  [`wave-a11y`](../wave-a11y/SKILL.md),
  [`ibm-equal-access-a11y`](../ibm-equal-access-a11y/SKILL.md) - 
  alternative scanners.
