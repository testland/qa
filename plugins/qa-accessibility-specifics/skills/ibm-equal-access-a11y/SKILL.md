---
name: ibm-equal-access-a11y
description: "Authors and runs IBM Equal Access accessibility-checker scans - IBM's open-source a11y engine with WCAG 2.0 / 2.1 / 2.2 + US Section 508 rule sets, integrating with Node / Selenium / Puppeteer / Playwright / Karma / Cypress test runners. Distinguished by IBM's enterprise-tier rule coverage and Section 508 specificity. Use when the project ships to US federal / public-sector customers (Section 508 mandate) or when the team values IBM-branded a11y reporting."
rating: 23
d6: 4
archetype: S1
---

# ibm-equal-access-a11y

## Overview

IBM Equal Access provides an accessibility-checker as part of the
broader Equal Access Toolkit, supporting a11y across "planning,
design, development, and verification phases" ([equal-access][readme]).

[readme]: https://github.com/IBMa/equal-access

The differentiator vs. axe-core / pa11y / Lighthouse is **US Section
508** specificity (federal-procurement compliance for US agencies)
and IBM-branded enterprise rule sets.

## When to use

- The project ships to US federal / public-sector customers under
  Section 508 procurement requirements.
- An enterprise compliance program mandates IBM-branded reports.
- The team uses Selenium / Puppeteer / Playwright and wants an
  alternative to axe-core for cross-checking.
- Rule sets beyond WCAG (e.g. IBM's internal accessibility guidelines)
  are required.

For most projects without Section 508 / enterprise-IBM constraints,
[`axe-a11y`](../axe-a11y/SKILL.md) is the standard recommendation - 
larger ecosystem, simpler integration. IBM Equal Access becomes
the right choice when the constraints above apply.

## Install

```bash
npm install --save-dev accessibility-checker
```

(Per [equal-access][readme].)

For framework-specific wrappers:

| Framework  | Package                                            |
|------------|----------------------------------------------------|
| Cypress    | `cypress-accessibility-checker`                    |
| Karma      | bundled in `accessibility-checker`                 |
| Selenium / Puppeteer / Playwright | bundled in `accessibility-checker`  |

## Authoring scans

### Node / Puppeteer example

```javascript
const { ace, getCompliance } = require('accessibility-checker');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');

  const results = await getCompliance(page, 'My scan label');

  if (results.report.fail.length > 0) {
    console.error('a11y violations:', results.report.fail);
    process.exit(1);
  }

  await browser.close();
})();
```

(Adapted from [equal-access][readme].)

### Configuration

`.achecker.yml` at the project root sets project-wide options:

```yaml
ruleArchive: latest                  # or a specific version
policies:
  - WCAG_2_2                         # primary; enable per project's compliance target
  - WCAG_2_1
  - IBM_Accessibility_2_2_2          # IBM's superset
failLevels:
  - violation
  - potentialviolation
reportLevels:
  - violation
  - potentialviolation
  - recommendation
  - potentialrecommendation
captureScreenshots: false
outputFormat:
  - json
  - html
outputFolder: a11y-reports
```

### Rule sets / policies

Per [equal-access][readme], available policies include:

| Policy                          | Coverage                                      |
|---------------------------------|-----------------------------------------------|
| `WCAG_2_0`                       | WCAG 2.0 baseline.                             |
| `WCAG_2_1`                       | WCAG 2.1 (adds mobile / vision-related SCs).   |
| `WCAG_2_2`                       | WCAG 2.2 (adds auth + drag + target-size SCs). |
| `IBM_Accessibility`              | IBM's superset including beyond-WCAG rules.   |
| `IBM_Accessibility_2_2_2`        | IBM's WCAG-2.2-aligned set.                    |

**US Section 508** alignment is via the IBM-branded policies (the
toolkit's compliance documentation maps Section 508 to specific
rule combinations).

## Results structure

`getCompliance()` returns:

```json
{
  "label": "My scan label",
  "report": {
    "scanID": "abc-123",
    "toolID": "accessibility-checker-v3.0.0",
    "summary": {
      "URL": "https://example.com/",
      "counts": {
        "violation": 5,
        "potentialviolation": 3,
        "recommendation": 12,
        "potentialrecommendation": 8,
        "manual": 2,
        "pass": 1843
      },
      "scanTime": 2341,
      "ruleArchive": "..."
    },
    "results": [
      {
        "ruleId": "WCAG20_Img_HasAlt",
        "level": "violation",
        "value": ["VIOLATION", "FAIL"],
        "message": "Image is missing alternative text.",
        "snippet": "<img src='...'>",
        "path": { "dom": "html/body/main[1]/img[2]" }
      }
    ]
  }
}
```

| Level                       | Severity                                   |
|-----------------------------|--------------------------------------------|
| `violation`                 | Definite WCAG failure.                      |
| `potentialviolation`        | Likely failure; needs manual review.       |
| `recommendation`            | Best-practice improvement.                 |
| `potentialrecommendation`   | Likely improvement.                         |
| `manual`                    | Issues requiring manual review.             |

For CI gating, fail on `violation` (and optionally
`potentialviolation`); aggregate the rest at the gate.

## Test framework integration

### Playwright

```javascript
const { test } = require('@playwright/test');
const { getCompliance } = require('accessibility-checker');

test('checkout passes IBM Equal Access', async ({ page }) => {
  await page.goto('/checkout');
  const results = await getCompliance(page, 'checkout-page');

  const violations = results.report.results.filter(r => r.level === 'violation');
  expect(violations).toHaveLength(0);
});
```

### Cypress (via wrapper)

```javascript
import 'cypress-accessibility-checker';

it('checkout passes IBM Equal Access', () => {
  cy.visit('/checkout');
  cy.getCompliance().then(results => {
    expect(results.report.results.filter(r => r.level === 'violation')).to.have.length(0);
  });
});
```

## CI integration

```yaml
# .github/workflows/ibm-a11y.yml
name: ibm-a11y

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ibm-equal-access:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run a11y tests
        run: npx playwright test tests/a11y/ibm-equal-access/

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ibm-a11y-reports
          path: a11y-reports/
          retention-days: 14
```

For the ratchet pattern (block only on net-new violations), pipe
the JSON output to
[`a11y-violation-gate`](../a11y-violation-gate/SKILL.md).

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Asserting only `violation` count is 0                        | Existing legacy debt blocks every PR.                              | Use [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) ratchet. |
| Mixing IBM Equal Access with axe-core in the same gate       | Same issue can be flagged twice with different rule IDs; noise.   | Run IBM separately; cross-check at audit time, not at gate time. |
| Using `IBM_Accessibility` policy without justification       | Adds rules beyond WCAG; CI fails on issues that aren't actual conformance failures. | Default to `WCAG_2_2`; add `IBM_Accessibility` only when the team has explicit IBM-branded compliance requirements. |
| Skipping the `manual` level                                  | Items needing human review go unreviewed.                          | Track `manual` count; require sign-off from a human reviewer at release time. |

## Limitations

- **Smaller community than axe-core.** Fewer Stack Overflow
  answers, fewer third-party integrations.
- **Heavier integration.** The toolkit is comprehensive but the
  setup is more involved than axe-core's drop-in.
- **Section 508 specificity.** This is also the strength - but
  for non-US-public-sector projects, the extra coverage may not
  be load-bearing.

## References

- [equal-access][readme] - main repo: install, supported test
  frameworks, rule archives.
- IBM Equal Access Toolkit - https://www.ibm.com/able/toolkit/
- US Section 508 - https://www.section508.gov/
- [`axe-a11y`](../axe-a11y/SKILL.md),
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
  [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md),
  [`wave-a11y`](../wave-a11y/SKILL.md) - alternative scanners.
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) - CI
  gate for ratchet-pattern blocking.
