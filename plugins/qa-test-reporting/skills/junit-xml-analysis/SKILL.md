---
name: junit-xml-analysis
description: "Parses JUnit-format XML reports (the de-facto interchange format every CI ingests - Jenkins, GitHub Actions, GitLab, Buildkite, CircleCI), extracts per-suite + per-case metrics (passed / failed / errored / skipped, time, classname, message, stack), groups failures by classname for trend analysis, and distinguishes \"new failures vs flakes\" by cross-referencing rerun elements (`<flakyFailure>`, `<rerunFailure>`). Use when the team needs PR-time test analytics from any framework that emits JUnit XML - almost all of them."
rating: 25
d6: 4
archetype: S1
---

# junit-xml-analysis

## Overview

The "JUnit XML" format is the de-facto schema every CI consumes. It
originated with Apache Ant's JUnit task, was widened by Jenkins, and
is now emitted by **virtually every test runner** - pytest, Jest,
Mocha, Vitest, Go test (`gotestsum`), Maven Surefire, Gradle,
Newman, Cypress, Playwright (via reporter), RSpec (via formatter),
and the rest.

Per [llg-junit][junit] (the most-cited community schema reference,
used by Jenkins's parser):

[junit]: https://llg.cubic.org/docs/junit/

> "Root element: `<testsuites>` (optional if only one suite exists;
> `<testsuite>` can be the root instead)."

The hierarchy is **`testsuites` → `testsuite` → `testcase`**, with
result child elements (`<failure>`, `<error>`, `<skipped>`) hanging
off each `testcase`.

This skill covers parsing the format, building per-suite +
per-case metrics, and the **flaky-vs-new** distinction via the
modern `<rerunFailure>` / `<flakyFailure>` extensions
([llg-junit][junit]).

## When to use

- The CI emits JUnit XML and the team needs PR-time analytics
  (failure clusters, slow-test list, flake suspects) without
  buying a commercial test analytics SaaS.
- A single team has multiple frameworks (pytest in services, Jest
  in frontend, Go test in tools) - JUnit XML is the lowest common
  denominator across them.
- A regression dashboard needs structured input.

## Step 1 - Schema overview

Per [llg-junit][junit]:

| Level         | Required attributes              | Common attributes                                              |
|---------------|----------------------------------|----------------------------------------------------------------|
| `testsuites`  | (none required at root)          | `tests`, `failures`, `errors`, `disabled`, `time`, `name`     |
| `testsuite`   | `name`, `tests`                  | `failures`, `errors`, `skipped`, `time`, `timestamp`, `hostname`, `id`, `package` |
| `testcase`    | `name`, `classname`              | `time`, `assertions`, `status`                                 |

Each `<testcase>` contains **at most one** of:

- `<skipped message="">` - test not executed
- `<error message="" type="">` - "unanticipated problem (uncaught
  exception, crash)" ([llg-junit][junit])
- `<failure message="" type="">` - "explicit test failure
  (assertion failed)" ([llg-junit][junit])

Plus optional:

- `<system-out>` - stdout captured during execution
- `<system-err>` - stderr captured during execution
- `<properties>` - environment settings as name/value pairs

**Critical distinction**: per [llg-junit][junit], `<failure>` is an
assertion failure (the test made a claim that came back false).
`<error>` is an exception or crash before the assertion ran. Group
them differently in dashboards - errors are usually environment /
infra; failures are usually code or fixture drift.

## Step 2 - Parse safely

Use a streaming parser for large files (multi-thousand-test suites
are common). Python:

```python
# scripts/parse_junit.py
import xml.etree.ElementTree as ET

def parse_junit(path):
    tree = ET.parse(path)
    root = tree.getroot()
    suites = root.findall('testsuite') if root.tag == 'testsuites' else [root]

    for suite in suites:
        for case in suite.findall('testcase'):
            yield {
                'suite': suite.get('name'),
                'classname': case.get('classname'),
                'name': case.get('name'),
                'time': float(case.get('time') or 0),
                'status': classify(case),
                'failure_message': (case.find('failure') or case.find('error') or {}).get('message'),
            }

def classify(case):
    if case.find('failure') is not None: return 'failure'
    if case.find('error')   is not None: return 'error'
    if case.find('skipped') is not None: return 'skipped'
    return 'pass'
```

Node:

```javascript
import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'node:fs';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const xml = parser.parse(readFileSync(path, 'utf8'));

const suites = xml.testsuites
  ? (Array.isArray(xml.testsuites.testsuite) ? xml.testsuites.testsuite : [xml.testsuites.testsuite])
  : [xml.testsuite];

for (const suite of suites) {
  const cases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
  // ...
}
```

**Always handle both shapes**: the root may be `<testsuites>` or
`<testsuite>` per [llg-junit][junit]. Single-element collapsing
(one testsuite/testcase = bare object, multiple = array) is also
common in JS XML libs.

## Step 3 - Distinguish new failures from flakes

Per [llg-junit][junit], the schema "supports modern variants
including `<flakyFailure>`, `<flakyError>`, `<rerunFailure>`, and
`<rerunError>` elements for additional test run metadata."

When the runner does automatic retries (Maven Surefire's
`rerunFailingTestsCount`, pytest-rerunfailures, etc.):

- A test that **passed on retry** emits a `<flakyFailure>` (or
  `<flakyError>`) child with the original failure.
- A test that **failed on every retry** emits one or more
  `<rerunFailure>` children plus the final `<failure>`.

Classification:

```python
def reliability(case):
    has_flaky = case.find('flakyFailure') is not None or case.find('flakyError') is not None
    has_rerun = case.find('rerunFailure') is not None or case.find('rerunError') is not None
    has_final = case.find('failure') is not None or case.find('error') is not None
    if has_flaky and not has_final:    return 'flaky'        # passed on retry
    if has_rerun and has_final:        return 'consistently_failing'
    if has_final:                      return 'newly_failed'
    return 'pass'
```

Surface flaky tests in a separate report - they're noise to the
PR author but signal to the test-suite owner.

## Step 4 - Aggregate per-suite metrics

```python
from collections import defaultdict

def per_suite(cases):
    agg = defaultdict(lambda: {'pass': 0, 'failure': 0, 'error': 0, 'skipped': 0, 'flaky': 0, 'time': 0.0})
    for c in cases:
        agg[c['suite']][c['status']] += 1
        agg[c['suite']]['time'] += c['time']
    return agg
```

## Step 5 - Trend analysis (cross-run)

To detect "is this a new failure or has this test been failing for
a week?", store every run's parsed metrics in a per-suite history
file:

```jsonl
{"sha":"abc123","ts":"2026-05-05T14:00:00Z","suite":"checkout","failure":2,"flaky":1,"time":12.4}
{"sha":"def456","ts":"2026-05-05T14:30:00Z","suite":"checkout","failure":2,"flaky":0,"time":12.1}
```

Compare by suite + classname:

| classname             | name                       | last 5 runs result | first failed sha |
|-----------------------|----------------------------|--------------------|------------------|
| `cart.CartTest`       | `addItem_validatesStock`   | F F F F F          | `abc123` (5 days ago) |
| `checkout.PromoTest`  | `applyPromo_caseInsensitive` | P P P P F        | this PR (suspected regression) |

The first row is a stale failure; the second is a probable
regression.

## Step 6 - Per-case slow-test list

Sort `testcases` by `time` descending. The top 1% is the fast
feedback target - moving any one of them from 30s → 3s saves more
than refactoring a hundred tests that already run in <100ms.

## Step 7 - CI integration

```yaml
# .github/workflows/test-analytics.yml
- name: Run tests (any framework, JUnit XML reporter enabled)
  run: npm test -- --reporters=default,jest-junit
  env:
    JEST_JUNIT_OUTPUT_FILE: junit.xml

- name: Analyze JUnit XML
  if: always()
  run: python scripts/parse_junit.py junit.xml > analytics.json

- name: Upload analytics
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: junit-analytics
    path: |
      junit.xml
      analytics.json
```

`if: always()` is critical - JUnit XML matters most on failed runs.

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                              | Fix |
|-------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Treating `<error>` and `<failure>` as the same                          | Errors are usually infra (DB connection lost), failures are usually code. Conflating hides root-cause patterns. | Group separately per [llg-junit][junit]. |
| Dropping `<flakyFailure>` reports from the dashboard                    | Hidden flake budget; quality erodes silently.                             | Surface flaky tests on a separate panel; assign owner. |
| Loading multi-MB XML with `xml.dom.minidom.parseString`                 | Whole-tree-in-memory. OOM on large suites.                                | `xml.etree.ElementTree.iterparse` for streaming. |
| Failing the build on any `<skipped>` count > 0                          | Many runners legitimately skip (platform-gated, conditional).             | Skip is informational; only fail on `failure` / `error`. |
| Hardcoding `<testsuites>` as the root                                   | Some runners emit a single `<testsuite>` as the root.                     | Detect both shapes (Step 2). |
| Trusting `time` for sub-millisecond tests                                | Some runners emit `0` for any test under their granularity; sort breaks. | Treat `time = 0` as "not measured"; don't include in slow-test list. |
| Cross-suite aggregation by `name` alone                                  | Two suites can have a `it('renders')` each - merging false-flags both.   | Always group by `(classname, name)` tuple. |

## Limitations

- **No standard schema document.** "JUnit XML" is a de-facto
  format with framework-specific dialects. Fields like `assertions`
  may or may not appear; the parser must be tolerant.
- **No structured assertion details by default.** The `<failure>`
  element's body is unstructured text - assertion targets,
  expected vs actual, and source line are runner-dependent.
- **Time precision varies.** Java runners report ms; some Node
  runners report seconds with 3-decimal precision; some report 0
  for fast tests.
- **Reruns require runner support.** Frameworks without a built-in
  retry mechanism don't emit `<flakyFailure>` - flake detection
  has to come from cross-run comparison instead (Step 5).

## References

- [llg-junit][junit] - community-maintained JUnit XML schema
  reference (used by Jenkins's parser): root element variants,
  required vs optional attributes, child element catalog including
  modern `<flakyFailure>` / `<rerunFailure>`.
- [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) - 
  parallel skill for coverage report diffs (different format,
  same PR-time analytics shape).
- [`allure-reports`](../allure-reports/SKILL.md) - richer reporting
  built on top of `allure-results`; consumes JUnit XML via per-runner
  adapters when needed.
