# pa11y - CLI scanner (htmlcs + axe engines)

Companion reference for `axe-a11y`. Consult when the project needs scriptable
a11y scans without a full test framework (CI cron job, docs publication,
static-site CI), or when a Node-stack project wants a single-command scanner
instead of framework-integrated axe tests.

pa11y is "your automated accessibility testing pal" - a Node.js CLI that runs
a11y tests on a page via the command line or a programmatic API
([pa11y][readme]). It can use HTML CodeSniffer (htmlcs, default) or axe-core
as the underlying engine. If the project already runs Playwright / Cypress
with axe-core, prefer the direct axe integration in SKILL.md - pa11y adds a
layer.

[readme]: https://github.com/pa11y/pa11y

## Install and run

```bash
npm install -g pa11y        # or --save-dev per-project
pa11y https://example.com
```

(Per [pa11y][readme].)

## Key flags

| Flag                 | Effect                                                        |
|----------------------|---------------------------------------------------------------|
| `--reporter <name>`  | Output format: `cli` (default), `csv`, `json`, `html`, `tsv`. |
| `--standard <name>`  | WCAG standard: `WCAG2A`, `WCAG2AA` (default), `WCAG2AAA`.     |
| `--runner <name>`    | Engine: `htmlcs` (default) or `axe`; repeat to run both.      |
| `--include-warnings` | Include warning-level issues (excluded by default).           |
| `--include-notices`  | Include notice-level issues.                                  |
| `--ignore <rules>`   | Skip specific rules (comma-separated).                        |
| `--threshold <n>`    | Allow up to N issues before failing (exit-code gate).         |
| `--timeout <ms>`     | Page-load timeout.                                            |
| `--config <file>`    | Use a `.pa11yrc` config file.                                 |

pa11y's `WCAG2AA` standard is 2.0/2.1; WCAG 2.2 SCs (2.4.11, etc.) need
`--runner axe` alongside `htmlcs`.

## Multi-URL with pa11y-ci

`pa11y-ci` (https://github.com/pa11y/pa11y-ci) batches a URL set from a
`.pa11yci` config and exits non-zero if any URL exceeds threshold - the
canonical CI gate signal:

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

## Programmatic API and results structure

```javascript
const pa11y = require('pa11y');

const results = await pa11y('https://example.com', {
  standard: 'WCAG2AA',
  runners: ['axe', 'htmlcs'],
  includeWarnings: true,
});

console.log(results.issues);
```

`results.issues[]` holds one object per finding with `code`, `type`
(error / warning / notice), `typeCode`, `selector`, `context`, `message`, and
`runner`. When both engines run, the same defect appears twice under
different codes - WCAG-SC-coded from htmlcs
(`WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail`), rule-coded from axe
(`color-contrast`) - and `a11y-violation-gate` collapses the pair via its
`fingerprint` field.

## Worked example

```bash
pa11y --standard WCAG2AA \
      --runner htmlcs --runner axe \
      --include-warnings \
      --reporter json \
      --threshold 0 \
      https://staging.example.com/checkout > pa11y-results.json
```

The run exits non-zero (threshold 0 exceeded) and `pa11y-results.json` holds
the `issues[]` array for the gate.

## Anti-patterns

| Anti-pattern                                    | Why it fails                                                        | Fix |
|-------------------------------------------------|---------------------------------------------------------------------|-----|
| Default `WCAG2AA` without WCAG 2.2 specifics    | The htmlcs standard is 2.0/2.1; 2.2 SCs need the axe runner.       | Always include `--runner axe`. |
| Threshold 0 on a project with debt              | Every PR fails until the entire backlog is fixed.                  | Use `a11y-violation-gate` ratchet OR raise threshold incrementally. |
| Running only htmlcs                             | Different rule coverage than axe; misses issues.                    | Run both runners; deduplicate at the gate. |
| Ignoring rules without config comments          | Lost institutional knowledge.                                       | Inline justification + quarterly review. |

## Limitations

- **Selector reliability.** htmlcs sometimes produces selectors that don't
  uniquely identify the failing element; axe is more precise.
- **JS-rendered content.** pa11y's default Chromium runner waits for the
  `load` event; SPAs may need `--wait-for-selector` before scanning.
- **No native test-framework integration.** For Playwright / Cypress, use
  the direct axe integration in SKILL.md.

## References

- pa11y - https://github.com/pa11y/pa11y (install, CLI flags, runners,
  reporter formats).
- pa11y-ci - https://github.com/pa11y/pa11y-ci (multi-URL).
- HTML CodeSniffer (the htmlcs runner) - https://github.com/squizlabs/HTML_CodeSniffer
