# IBM Equal Access accessibility-checker

Companion reference for `axe-a11y`. Consult when the project ships to US
federal / public-sector customers under Section 508 procurement, when an
enterprise compliance program mandates IBM-branded reports, or to cross-check
axe results from Selenium / Puppeteer / Playwright suites. For most projects
without those constraints, direct axe (SKILL.md) is the standard
recommendation - larger ecosystem, simpler integration.

IBM Equal Access provides an accessibility-checker as part of the broader
Equal Access Toolkit, supporting a11y across "planning, design, development,
and verification phases" ([equal-access][readme]). The differentiator vs.
axe / pa11y / Lighthouse is **US Section 508** specificity and IBM-branded
enterprise rule sets.

[readme]: https://github.com/IBMa/equal-access

## Install

```bash
npm install --save-dev accessibility-checker
```

(Per [equal-access][readme].) Cypress uses the
`cypress-accessibility-checker` wrapper; Karma / Selenium / Puppeteer /
Playwright are bundled in `accessibility-checker`.

## Authoring scans

```javascript
const { getCompliance } = require('accessibility-checker');

const results = await getCompliance(page, 'My scan label');
if (results.report.results.filter(r => r.level === 'violation').length > 0) {
  process.exit(1);
}
```

(Adapted from [equal-access][readme]; `page` is a Puppeteer / Playwright
page.)

### Configuration (`.achecker.yml`)

```yaml
ruleArchive: latest
policies:
  - WCAG_2_2
failLevels:
  - violation
  - potentialviolation
reportLevels:
  - violation
  - potentialviolation
  - recommendation
outputFormat:
  - json
  - html
outputFolder: a11y-reports
```

### Rule sets / policies

Per [equal-access][readme]:

| Policy                   | Coverage                                        |
|--------------------------|-------------------------------------------------|
| `WCAG_2_0`               | WCAG 2.0 baseline.                              |
| `WCAG_2_1`               | WCAG 2.1 (adds mobile / vision-related SCs).    |
| `WCAG_2_2`               | WCAG 2.2 (adds auth + drag + target-size SCs).  |
| `IBM_Accessibility`      | IBM's superset including beyond-WCAG rules.     |
| `IBM_Accessibility_2_2_2`| IBM's WCAG-2.2-aligned set.                     |

**US Section 508** alignment is via the IBM-branded policies (the toolkit's
compliance documentation maps Section 508 to specific rule combinations).

## Results structure

`getCompliance()` returns a `report` with a `summary.counts` block and a
`results[]` array; each result carries `ruleId` (e.g. `WCAG20_Img_HasAlt`),
`level`, `message`, `snippet`, and a DOM `path`. Severity levels:

| Level                     | Severity                              |
|---------------------------|---------------------------------------|
| `violation`               | Definite WCAG failure.                |
| `potentialviolation`      | Likely failure; needs manual review.  |
| `recommendation`          | Best-practice improvement.            |
| `potentialrecommendation` | Likely improvement.                   |
| `manual`                  | Requires manual review.               |

For CI gating, fail on `violation` (and optionally `potentialviolation`);
aggregate the rest at the gate.

## Playwright integration

```javascript
const { test, expect } = require('@playwright/test');
const { getCompliance } = require('accessibility-checker');

test('checkout passes IBM Equal Access', async ({ page }) => {
  await page.goto('/checkout');
  const results = await getCompliance(page, 'checkout-page');
  const violations = results.report.results.filter(r => r.level === 'violation');
  expect(violations).toHaveLength(0);
});
```

For the ratchet pattern (block only on net-new violations), pipe the JSON
output to `a11y-violation-gate` instead of asserting zero.

## Anti-patterns

| Anti-pattern                                    | Why it fails                                                   | Fix |
|-------------------------------------------------|----------------------------------------------------------------|-----|
| Asserting `violation` count is 0                | Legacy debt blocks every PR.                                   | `a11y-violation-gate` ratchet. |
| Mixing Equal Access with axe in the same gate   | Same issue flagged twice under different rule IDs; noise.      | Run separately; cross-check at audit time. |
| `IBM_Accessibility` policy without justification| CI fails on issues that aren't conformance failures.           | Default to `WCAG_2_2`; add IBM policies only for IBM-branded compliance. |
| Skipping the `manual` level                     | Items needing human review go unreviewed.                      | Track `manual` count; human sign-off at release. |

## Limitations

- **Smaller community than axe-core** - fewer integrations and answers.
- **Heavier setup** than axe's drop-in.
- **Section 508 specificity** is the strength; for non-US-public-sector
  projects the extra coverage may not be load-bearing.

## References

- IBM Equal Access - [equal-access][readme] (install, supported test
  frameworks, rule archives).
- IBM Equal Access Toolkit - https://www.ibm.com/able/toolkit/
- US Section 508 - https://www.section508.gov/
