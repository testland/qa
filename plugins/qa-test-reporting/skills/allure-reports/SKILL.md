---
name: allure-reports
description: "Configures Allure Report for the project (test-runner adapter installation, `allure-results` directory wiring, `categories.json` for failure classification, `history-trend.json` retention via the copy-history-between-runs pattern), runs the Allure CLI to convert `allure-results` to a static HTML site, and uploads the report as a CI artifact. Use when the team needs richer test reporting than JUnit XML — step-level attachments, per-test history, retry tracking, and severity / epic / feature labeling — across the framework-agnostic adapter ecosystem (pytest, Jest, JUnit, TestNG, NUnit, Mocha, etc.)."
rating: 23
d6: 3
archetype: S1
---

# allure-reports

## Overview

Allure Report is "an open-source framework-agnostic test result
visualization tool" that "transforms test execution data into clear,
interactive HTML reports" ([allure-docs][allure]). It "supports
testing frameworks across JavaScript, Python, Java, C#, PHP, and
Ruby" with 30+ adapters ([allure-docs][allure]).

[allure]: https://allurereport.org/docs/

Allure's two-stage workflow:

1. **Tests run** with an Allure adapter installed. The adapter
   writes per-test JSON files into an `allure-results/` directory.
2. **Allure CLI generates** the static HTML site from
   `allure-results/`, optionally merging in history from a previous
   run for trend graphs.

The two artifacts are kept separate intentionally: results are
runner-emitted; the report is a static deliverable.

## When to use

- The team needs richer reporting than JUnit XML — per-step
  attachments, screenshots on failure, history trends, severity /
  epic / feature labels, custom categorization of failures.
- A multi-framework project (pytest + Jest + JUnit) needs **one**
  unified report instead of three separate ones.
- An air-gapped or compliance-restricted environment needs static
  HTML output (vs SaaS test-management).

If the team only needs JUnit pass/fail and the CI already surfaces
that, see [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md) —
that's a much lighter dependency.

## Step 1 — Install the framework adapter

Each runner has a per-language adapter that writes to
`allure-results/`. Examples:

| Framework         | Package / coordinate                              | Output dir env var (typical) |
|-------------------|---------------------------------------------------|------------------------------|
| pytest            | `pip install allure-pytest`                       | `--alluredir=allure-results` |
| Jest              | `npm i -D allure-jest`                            | `outputFolder` config        |
| Mocha             | `npm i -D allure-mocha`                           | `outputFolder` config        |
| JUnit 5           | `org.junit.platform:junit-platform-launcher` + `io.qameta.allure:allure-junit5` | `allure.results.directory` system property |
| TestNG            | `io.qameta.allure:allure-testng`                  | `allure.results.directory`   |
| NUnit / xUnit     | NuGet `Allure.NUnit` / `Allure.Xunit`              | `allureConfig.json` `directory` |

Adapter docs are at the framework-specific subpaths under
`allurereport.org/docs/` ([allure-docs][allure]).

The output of running tests with the adapter installed is a
directory of per-test JSON files (`<uuid>-result.json`,
`<uuid>-container.json`, plus `attachment-<uuid>.<ext>` files for
screenshots / logs).

## Step 2 — Generate the static report

Install the Allure CLI ([allure-docs][allure] linked from
"Installation"):

```bash
# Node-based (cross-platform):
npm install -g allure-commandline
# Or via Scoop / Homebrew / apt — see allurereport.org/docs/ install pages.
```

Generate from the results directory:

```bash
allure generate allure-results --clean -o allure-report
```

`--clean` removes the previous `allure-report/` before regenerating;
`-o` sets the output dir.

To preview locally:

```bash
allure open allure-report
```

Or in one shot (useful in dev — runs a temp server with a freshly
generated report):

```bash
allure serve allure-results
```

(See `allurereport.org/docs/` for the CLI reference; specific flags
have evolved across Allure 2.x and Allure 3 — pin a version in CI to
avoid drift.)

## Step 3 — Configure failure categories

Per [allure-categories][cats], `categories.json` placed in
`allure-results/` defines custom failure classification. Each entry
matches by message regex, trace regex, and result statuses
(`failed`, `broken`, `passed`, `skipped`, `unknown`):

[cats]: https://allurereport.org/docs/categories/

```json
[
  {
    "name": "Ignored tests",
    "messageRegex": ".*ignored.*",
    "matchedStatuses": ["skipped"]
  },
  {
    "name": "Infrastructure problems",
    "messageRegex": ".*RuntimeException.*",
    "matchedStatuses": ["broken"]
  }
]
```

Per [allure-categories][cats], category objects also support
`traceRegex` (matches against stack trace) and `flaky` (boolean) to
mark a category as flaky-by-default.

> "The array order determines the matching sequence Allure applies
> when categorizing test results." ([allure-categories][cats])

So order from most-specific to least-specific. A "DB connection
refused" category should precede a generic "Infrastructure" category.

## Step 4 — Wire history retention

Per [allure-history][hist], history is what drives the trends panel
("first failed", "last passed", flake / retry rate over time):

[hist]: https://allurereport.org/docs/history-and-retries/

> "Allure Report uses a **history ID** to link test results across
> multiple runs. This identifier is automatically calculated based
> on the test's fully-qualified name and its parameters."

For Allure 2 (the broadly-deployed version), enabling history is
manual ([allure-history][hist]):

> 1. Generate your initial report in the `allure-report` directory
> 2. Remove the `allure-results` directory
> 3. Run tests
> 4. Copy `allure-report/history` subdirectory to
>    `allure-results/history`
> 5. Generate the next report

In CI, that becomes:

```bash
# Before running tests
mkdir -p allure-results
if [ -d previous-allure-report/history ]; then
  cp -r previous-allure-report/history allure-results/
fi

# Run tests (writes to allure-results/)
npm test

# Generate
allure generate allure-results --clean -o allure-report

# Save the history slice for next time
# (Upload allure-report/ as an artifact; download into previous-allure-report/ on next run.)
```

Per [allure-history][hist]: "If you follow such a routine regularly,
Allure will each time keep data from up to 20 latest reports in
`allure-results/history`."

For Allure 3 ([allure-history][hist]):

> "Allure 3 simplifies this by using a single JSONL history file.
> You configure it in your settings file with a `historyPath`
> parameter."

## Step 5 — Distinguish retries from history

Per [allure-history][hist]:

> "**Retries**: Multiple runs of the same test within a single
> launch (same `allure-results` directory)."
>
> "**History**: Links to the same test across different launches,
> enabling trend analysis and stability tracking."

Don't clear `allure-results` between retries within a run — that
collapses retry data. Do clear it between launches (different
commits / runs) — only `history/` subdir is preserved.

## Step 6 — CI integration (GitHub Actions)

```yaml
# .github/workflows/test-with-allure.yml
name: test-with-allure
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Restore previous Allure history
        uses: actions/download-artifact@v4
        with:
          name: allure-history
          path: previous-allure-report
        continue-on-error: true   # First run on a branch has no history

      - name: Seed history into results dir
        run: |
          mkdir -p allure-results
          if [ -d previous-allure-report/history ]; then
            cp -r previous-allure-report/history allure-results/
          fi

      - name: Run tests with Allure adapter
        run: npm test    # adapter writes to allure-results/

      - name: Install Allure CLI
        run: npm install -g allure-commandline

      - name: Generate report
        if: always()
        run: allure generate allure-results --clean -o allure-report

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-report
          retention-days: 30

      - name: Save history for next run
        if: always() && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: allure-history
          path: allure-report/history
          retention-days: 90
```

`if: always()` on the report-generation steps is critical — Allure
matters most on failure.

For Allure history hosted on GitHub Pages, the `simple-elf/allure-report-action` GitHub Action automates the publish-to-Pages
workflow (third-party, not first-party Allure tooling).

## Step 7 — Add metadata to test cases

Allure's value compounds with metadata. The adapter exposes
per-language helpers; the canonical labels are **severity** (blocker
/ critical / normal / minor / trivial), **epic / feature / story**
(for BDD-style grouping), and **owner**.

```python
# pytest example
import allure

@allure.severity(allure.severity_level.CRITICAL)
@allure.epic('Checkout')
@allure.feature('Promo codes')
@allure.story('Apply at checkout')
def test_apply_promo_lowercase():
    ...
```

```javascript
// Jest / Mocha example
import { allure } from 'allure-jest';

allure.severity('critical');
allure.epic('Checkout');
allure.feature('Promo codes');
```

Severity drives the "blocker" / "critical" filter on the report's
overview; epic / feature / story drive the BDD-grouped view. Without
them, the report is a flat list — usable but missing Allure's main
selling point.

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                              | Fix |
|-------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping the history step                                               | Trends panel is empty; retry/flake history can't be tracked across runs.  | Wire the copy-history pattern (Step 4) per [allure-history][hist]. |
| Clearing `allure-results` mid-run                                        | Retry information is lost — retries appear as separate failed launches.   | Clear only between launches; preserve `history/` subdir per [allure-history][hist]. |
| `categories.json` ordered least-specific first                           | Generic "Infrastructure" category catches everything; specific categories never match. | Order most-specific first per [allure-categories][cats]. |
| Allure as a substitute for JUnit XML in PR gating                        | Allure's report is for humans, not gating; JUnit XML is the gate.         | Emit both; gate on JUnit; surface Allure as artifact. |
| One Allure adapter version + a different CLI version                     | Schema drift between adapter (results writer) and CLI (results reader); empty / corrupt report. | Pin both to compatible versions; bump together per [allure-docs][allure]. |
| Adapter installed but no metadata                                        | Report is a flat pass/fail list — same value as JUnit XML.                | Add severity / epic / feature / story (Step 7). |
| Treating `<uuid>-result.json` files as durable                            | The file naming and schema are per-Allure-version internal contracts.    | Don't post-process raw `allure-results/` files; consume the generated `allure-report/data/*.json` instead. |

## Limitations

- **No PR-coverage role.** Allure tells you which tests passed /
  failed / flaked; it doesn't measure code coverage. Pair with
  `lcov-analysis` / `cobertura-analysis` / `jacoco-analysis`.
- **History is per-CI-runner-local** unless explicitly persisted.
  GitHub Actions artifacts have a retention cap (default 90 days);
  for long-running history, consider GitHub Pages or S3 hosting.
- **Allure 2 vs Allure 3** ([allure-history][hist]) — Allure 2 is
  "stable, mature version with broader integrations"; Allure 3 is
  the rebuild. Many adapters still target 2.x. Don't mix versions.
- **Adapter feature parity varies.** Java adapters tend to be the
  reference; some JS / Python adapters lag behind on
  step-attachment APIs. Check the per-adapter docs.

## References

- [allure-docs][allure] — overview, framework-agnostic positioning,
  supported language list, navigation root.
- [allure-history][hist] — history ID mechanism, copy-history-between-runs
  routine for Allure 2, Allure 3 JSONL pattern, retries vs history
  distinction.
- [allure-categories][cats] — `categories.json` schema (`name`,
  `messageRegex`, `traceRegex`, `matchedStatuses`, `flaky`),
  matching order, sample.
- [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md) — leaner
  alternative when only pass/fail + flake detection is needed.
- [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md),
  [`lcov-analysis`](../lcov-analysis/SKILL.md),
  [`cobertura-analysis`](../cobertura-analysis/SKILL.md) — coverage
  side of the same PR review.
