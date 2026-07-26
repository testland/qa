---
name: pa11y-a11y
description: "Authors and runs pa11y accessibility scans - a CLI / Node.js tool that wraps HTML CodeSniffer (htmlcs) and / or axe-core engines - with `pa11y {url}` invocation, reporter selection (cli / csv / json / html / tsv), WCAG standard selection (WCAG2A / WCAG2AA / WCAG2AAA), and rule ignoring. Use when the project needs scriptable a11y scans without a full test framework, or when a Node-stack project wants an alternative to direct axe-core use."
---

# pa11y-a11y

## Overview

pa11y is "your automated accessibility testing pal" - a Node.js CLI
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
prefer `axe-a11y` - pa11y adds a layer.

## How to use

1. Install `pa11y` (or `pa11y-ci` for a URL set) as a dev dependency.
2. Pick the conformance target with `--standard` (default `WCAG2AA`)
   and add `--runner axe` alongside `htmlcs` for WCAG 2.2 coverage.
3. For one page run `pa11y <url>`; for a URL set list them in
   `.pa11yci` and run `pa11y-ci`.
4. Choose `--reporter json` and redirect to a file so CI can parse
   and archive it.
5. Set `--threshold` (0 for green-field, higher while burning down
   debt) so the exit code gates the build.
6. Add narrow `--ignore` entries for documented false positives, each
   justified in the config.
7. Pipe the JSON through `a11y-violation-gate` to dedupe cross-engine
   findings and ratchet against a baseline.
8. Verify: run `pa11y-ci` locally and confirm it exits zero (no URL over
   threshold) before merging; if it exits non-zero, fix the reported
   violations (or add a justified `--ignore` for a confirmed false
   positive) and re-run until green.

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

Common flags: `--reporter <name>` (`cli` / `csv` / `json` / `html` /
`tsv`), `--standard <name>` (`WCAG2A` / `WCAG2AA` / `WCAG2AAA`),
`--runner <name>` (`htmlcs` or `axe`), `--include-warnings`,
`--include-notices`, `--ignore <rules>`, `--threshold <n>`,
`--timeout <ms>`, and `--config <file>`. Full table with effects:
[references/flags-and-output.md](references/flags-and-output.md).

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

`pa11y-ci` exits non-zero if any URL exceeds threshold - the canonical
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

`results.issues[]` holds one object per finding with `code`, `type`
(error / warning / notice), `selector`, `context`, `message`, and
`runner`. When both engines run, the same defect appears twice under
different codes - WCAG-SC-coded from htmlcs, rule-coded from axe - and
`a11y-violation-gate` collapses the pair via its `fingerprint` field.
Full JSON shape and a dual-engine example:
[references/flags-and-output.md](references/flags-and-output.md).

## Worked example

Scan the staging checkout with both engines and capture JSON:

```bash
pa11y --standard WCAG2AA \
      --runner htmlcs --runner axe \
      --include-warnings \
      --reporter json \
      --threshold 0 \
      https://staging.example.com/checkout > pa11y-results.json
```

`--runner htmlcs --runner axe` runs **both** engines and merges the
issue list - broader coverage at the cost of duplicate findings.

The run exits non-zero (threshold 0 exceeded) and `pa11y-results.json`
holds an `issues[]` array. Cross-engine duplicates (see Results structure)
collapse to one record when piped through `a11y-violation-gate`.

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
| Threshold 0 on a project with debt                           | Every PR fails until the entire backlog is fixed.                | Use `a11y-violation-gate` for ratchet OR raise threshold incrementally. |
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
  Cypress, prefer `axe-a11y`.

## References

- [pa11y][readme] - main repo: install, CLI flags, runners,
  reporter formats.
- [references/flags-and-output.md](references/flags-and-output.md) -
  full CLI flag table and the issue JSON shape.
- pa11y-ci - https://github.com/pa11y/pa11y-ci (multi-URL).
- HTML CodeSniffer (the htmlcs runner) - https://github.com/squizlabs/HTML_CodeSniffer
- `axe-a11y` - direct axe usage (pa11y's
  alternative engine).
- `a11y-violation-gate` - CI
  gate consuming pa11y / axe results.
