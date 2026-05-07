---
name: pa11y-a11y
description: "Authors and runs pa11y accessibility scans — a CLI / Node.js tool that wraps HTML CodeSniffer (htmlcs) and / or axe-core engines — with `pa11y <url>` invocation, reporter selection (cli / csv / json / html / tsv), WCAG standard selection (WCAG2A / WCAG2AA / WCAG2AAA), and rule ignoring. Use when the project needs scriptable a11y scans without a full test framework, or when a Node-stack project wants an alternative to direct axe-core use."
rating: 24
d6: 4
archetype: S1
---

# pa11y-a11y

## Overview

pa11y is "your automated accessibility testing pal" — a Node.js CLI
that runs a11y tests on a page either via the command line or
programmatic API ([pa11y][readme]). It can use HTML CodeSniffer
(htmlcs, default) or axe-core as the underlying engine.

[readme]: https://github.com/pa11y/pa11y

## When to use

- A non-test-framework workflow needs scriptable a11y scans
  (CI cron job; documentation publication; static-site CI).
- The team wants a single command (`pa11y <url>`) rather than
  framework-integrated tests.
- Multiple URLs need to be batched (`pa11y-ci` is the matching
  multi-URL runner).

If the project already runs Playwright / Cypress with axe-core,
prefer [`axe-a11y`](../axe-a11y/SKILL.md) — pa11y adds a layer.

## Install

```bash
npm install -g pa11y
```

(Per [pa11y][readme]; or `--save-dev` for per-project.)

## Running

### Single URL

```bash
pa11y https://example.com
```

(Per [pa11y][readme].)

### Key flags

| Flag                       | Effect                                                 |
|----------------------------|--------------------------------------------------------|
| `--reporter <name>`        | Output format: `cli` (default), `csv`, `json`, `html`, `tsv`. |
| `--standard <name>`        | WCAG standard: `WCAG2A`, `WCAG2AA` (default), `WCAG2AAA`. |
| `--include-warnings`       | Include warning-level issues (excluded by default).   |
| `--include-notices`        | Include notice-level issues.                            |
| `--ignore <rules>`         | Skip specific rules (comma-separated).                 |
| `--runner <name>`          | Choose engine: `htmlcs` (default) or `axe`.            |
| `--threshold <n>`          | Allow up to N issues before failing.                   |
| `--timeout <ms>`           | Page-load timeout.                                     |
| `--config <file>`          | Use a `.pa11yrc` config file.                          |

### Worked example

```bash
pa11y --standard WCAG2AA \
      --runner htmlcs --runner axe \
      --include-warnings \
      --reporter json \
      --threshold 0 \
      https://staging.example.com/checkout > pa11y-results.json
```

`--runner htmlcs --runner axe` runs **both** engines and merges
the issue list — broader coverage at the cost of duplicate
findings (different engines flag the same issue).

## Multi-URL with pa11y-ci

For batching across many URLs:

```bash
npm install -g pa11y-ci
```

Configure `.pa11yci`:

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "includeWarnings": true,
    "threshold": 0
  },
  "urls": [
    "https://staging.example.com/",
    "https://staging.example.com/dashboard",
    "https://staging.example.com/checkout"
  ]
}
```

Run:

```bash
pa11y-ci
```

`pa11y-ci` exits non-zero if any URL exceeds threshold — the canonical
CI gate signal.

## Programmatic API

```javascript
const pa11y = require('pa11y');

const results = await pa11y('https://example.com', {
  standard: 'WCAG2AA',
  runners: ['axe', 'htmlcs'],
  includeWarnings: true,
});

console.log(results.issues);
```

`results.issues` is an array of issue objects with `code`, `type`
(error/warning/notice), `selector`, `context`, `message`.

## Results structure

```json
{
  "documentTitle": "Example",
  "pageUrl": "https://example.com/",
  "issues": [
    {
      "code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
      "type": "error",
      "typeCode": 1,
      "message": "This element has insufficient contrast at this conformance level.",
      "context": "<button>Submit</button>",
      "selector": "button.primary",
      "runner": "htmlcs"
    },
    {
      "code": "color-contrast",
      "type": "error",
      "typeCode": 1,
      "message": "Elements must meet minimum color contrast ratio thresholds",
      "context": "<button>Submit</button>",
      "selector": "button.primary",
      "runner": "axe"
    }
  ]
}
```

Note the **same issue from two engines** — htmlcs flags as
`WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail` (WCAG-SC-coded);
axe flags as `color-contrast` (rule-coded). Pipe through
[`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) to
deduplicate via the unified-record `fingerprint` field.

## CI integration

```yaml
# .github/workflows/pa11y.yml
name: pa11y

on:
  pull_request:
  push:
    branches: [main]

jobs:
  pa11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g pa11y-ci

      - name: Run pa11y-ci
        run: pa11y-ci

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pa11y-report
          path: |
            pa11y-results.json
            .pa11yci
          retention-days: 14
```

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Default standard `WCAG2AA` without WCAG 2.2 specifics       | pa11y's `WCAG2AA` standard is 2.0/2.1; WCAG 2.2 SCs (2.4.11, etc.) need axe-runner. | Always include `--runner axe` for 2.2 coverage. |
| Threshold 0 on a project with debt                           | Every PR fails until the entire backlog is fixed.                | Use [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) for ratchet OR raise threshold incrementally. |
| Running only htmlcs                                         | Different rule coverage than axe; misses some issues.            | Run both runners; deduplicate at the gate. |
| Ignoring rules without code comments                         | Lost institutional knowledge.                                     | Inline justification + quarterly review of ignore lists. |

## Limitations

- **Selector reliability.** htmlcs sometimes produces selectors
  that don't uniquely identify the failing element; axe is more
  precise.
- **JS-rendered content.** pa11y's default Chromium runner waits
  for `load` event; SPAs may need `--wait-for-selector` to delay
  scanning until the app is ready.
- **No native test-framework integration.** For Playwright /
  Cypress, prefer [`axe-a11y`](../axe-a11y/SKILL.md).

## References

- [pa11y][readme] — main repo: install, CLI flags, runners,
  reporter formats.
- pa11y-ci — https://github.com/pa11y/pa11y-ci (multi-URL).
- HTML CodeSniffer (the htmlcs runner) — https://github.com/squizlabs/HTML_CodeSniffer
- [`axe-a11y`](../axe-a11y/SKILL.md) — direct axe usage (pa11y's
  alternative engine).
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) — CI
  gate consuming pa11y / axe results.
