---
name: bug-report-from-failure
description: "On-demand builder that converts a SINGLE test failure record (JUnit XML, Allure JSON, pytest --tb=short, Playwright HTML, Cypress mocha-junit) into a structured, tracker-agnostic bug SPEC: extracts test name, assertion, stack trace, environment, and artefacts, and proposes severity, defect type (IEEE 1044), and a root-cause hypothesis (ISTQB CTAL-TA), then hands the JSON spec to a jira/linear/github-issues-bug-workflow runner to file. Use when you already hold a failure artefact and want one classified, ready-to-file report. Distinct from the event-driven CI orchestrator that triggers automatically on a pipeline failure and files in bulk, and from screen-recording-driven bug reporting; this is the on-demand, single-record spec builder."
---

# bug-report-from-failure

## Overview

A test failure produces structured data (XML, JSON, HTML) that
contains everything a triager needs - assertion, stack, test name,
environment - yet most teams write bug reports by hand, dropping
context. This workflow ingests the failure record and emits a
ready-to-file bug spec.

It composes:

- `bug-lifecycle-reference`
  for initial state (`New`).
- `severity-vs-priority-reference`
  for severity proposal (heuristic; reviewer confirms).
- `defect-taxonomy-istqb`
  for type / root-cause hypothesis fields.
- One of
  `jira-bug-workflow-runner`,
  `linear-bug-workflow-runner`,
  `github-issues-bug-workflow`
  as the filing backend.

**Distinct from screen-recording-driven bug reporting**: this one
starts from a CI failure record.

## When to use

- CI test failure auto-files a triaged bug.
- Manual investigation produces structured failure data - script
  this rather than write the report by hand.
- Bulk-filing bugs from a regression-suite run after a change
  flagged many failures.

## Step 1 - Ingest the failure record

The skill accepts these inputs (auto-detected by extension):

| Format | Source | Schema reference |
|---|---|---|
| JUnit XML | pytest, JUnit, surefire, Playwright | `<testsuites>/<testsuite>/<testcase>/<failure>` per the de-facto schema (Apache Ant) at [llg.cubic.org/docs/junit/](https://llg.cubic.org/docs/junit/) |
| Allure JSON | Allure framework (any language) | per-test JSON in `allure-results/`; schema at [docs.qameta.io/allure-report](https://docs.qameta.io/allure-report/) |
| pytest `--tb=short` log | pytest stdout/stderr | line-oriented; regex-driven |
| Playwright HTML report | Playwright trace | `report.json` inside the HTML bundle |
| TestNG XML | TestNG | similar to JUnit; per [testng.org](https://testng.org/) |

### JUnit XML parser

```python
import xml.etree.ElementTree as ET

def parse_junit(path):
    tree = ET.parse(path)
    failures = []
    for testcase in tree.iter("testcase"):
        f = testcase.find("failure") or testcase.find("error")
        if f is None:
            continue
        failures.append({
            "test": f"{testcase.get('classname')}::{testcase.get('name')}",
            "duration_s": float(testcase.get("time", 0)),
            "type": f.get("type") or "Failure",
            "message": f.get("message") or "",
            "stack": f.text or "",
            "system_out": (testcase.findtext("system-out") or "").strip(),
        })
    return failures
```

The JUnit XML schema is informal but stable; the Ant /
xUnit-family agreed-on tags are `testsuites`, `testsuite`,
`testcase`, `failure`, `error`, `skipped`, `system-out`,
`system-err`. Per [llg.cubic.org/docs/junit/](https://llg.cubic.org/docs/junit/),
the failure element's `type` attribute carries the assertion
class (e.g., `AssertionError`).

### Allure JSON

Allure stores per-test JSON files in `allure-results/`. The shape:

```json
{
  "uuid": "...",
  "name": "test_checkout_with_promo",
  "fullName": "tests.checkout.test_checkout_with_promo",
  "status": "failed",
  "statusDetails": {
    "message": "AssertionError: expected $22.49, got $24.99",
    "trace": "Traceback (most recent call last):\n  File..."
  },
  "labels": [
    {"name": "suite", "value": "checkout"},
    {"name": "severity", "value": "critical"},
    {"name": "feature", "value": "promo-codes"}
  ],
  "attachments": [
    {"name": "screenshot", "source": "abc123-attachment.png", "type": "image/png"}
  ]
}
```

Per [docs.qameta.io/allure-report](https://docs.qameta.io/allure-report/).
Allure's labels are first-class; the skill harvests `severity`,
`feature`, `suite`.

## Step 2 - Extract classification fields

For each failure, propose values for the bug report:

| Field | Source | Default if unknown |
|---|---|---|
| Title | First line of `failure.message` truncated to 100 chars | "Test failure: {test_name}" |
| Body | Markdown with test name, stack, env, links | (always present) |
| Severity | Allure `severity` label OR inferred from assertion class (`AssertionError` → Medium; `TimeoutError` → High; `ConnectionError` → High) | Medium |
| Priority | Match severity by default; production-runner = bump | Medium |
| Defect type (IEEE 1044) | Inferred from stack location: tests/* → Test specification; app/* → Code (implementation) | Code |
| Component | Allure `feature` / `suite` label OR top-of-stack module | (none) |

Severity inference rules (heuristic, reviewer confirms):

```python
SEVERITY_FROM_ERROR = {
    "AssertionError":   "medium",
    "TimeoutError":     "high",
    "ConnectionError":  "high",
    "OutOfMemoryError": "critical",
    "SecurityException": "critical",
}

def infer_severity(failure_type, message):
    if failure_type in SEVERITY_FROM_ERROR:
        return SEVERITY_FROM_ERROR[failure_type]
    if "production" in message.lower() or "p0" in message.lower():
        return "high"
    return "medium"
```

## Step 3 - Render the Markdown body

Standard template - consumed verbatim by every platform runner:

```markdown
## Test failure

**Test:** `<class>::<test>`
**Suite:** <suite>
**Duration:** <duration> s
**Environment:** <env from CI vars: branch, commit, OS, browser>

### Assertion

```
<failure.message>
```

### Stack trace

```
<failure.stack>
```

### Artefacts

- Screenshot: <link or attachment ref>
- Video: <link>
- HAR: <link>
- CI run: <link>
- Test source: <github permalink at commit sha>

### Classification (proposed - triager to confirm)

| Field | Value |
|---|---|
| Severity | <inferred> |
| Priority | <inferred> |
| Defect type (IEEE 1044) | <inferred> |
| Root cause (CTAL-TA) | (triager to assign) |
| Component | <inferred> |
| Suite | <inferred> |

### Reproduction

1. Check out `<commit>`
2. Run: `<command>`
3. Observe: <one-line description>

### History

<dupe-search result: any prior occurrences of this test failing in last N days>
```

## Step 4 - Search for duplicates

Before filing, search the platform tracker for open bugs with
matching title / test name. Use the per-platform skill:

```python
# Pseudo
def find_dupes(platform, test_name):
    if platform == "jira":
        return jira_bug_workflow_runner.search_jql(
            f'project = ENG AND text ~ "{test_name}" AND issuetype = Bug'
        )
    if platform == "linear":
        return linear_bug_workflow_runner.find_dupes(TEAM_ID, test_name)
    if platform == "github":
        return github_issues_bug_workflow.search_issues(
            f'is:open label:bug "{test_name}" in:title,body'
        )
```

If duplicates exist, the workflow attaches a comment instead of
creating a new bug.

## Step 5 - File the bug

Emit a tracker-agnostic spec:

```yaml
bug_spec:
  title: "Test failure: checkout fails with promo X"
  body: |
    ## Test failure
    ...
  severity: high
  priority: p2
  labels: [bug, type:regression, component:checkout]
  defect_type: Code
  component: checkout
  reproduction:
    commit: "abc123"
    command: "pytest tests/checkout/test_promo.py::test_stacked"
    environment:
      branch: main
      ci_run: "https://github.com/.../runs/123"
```

Then pass to the relevant platform-runner. Sample dispatcher:

```python
def file_bug(spec, platform):
    if platform == "jira":
        return jira_bug_workflow_runner.create_bug(
            project_key="ENG",
            summary=spec["title"],
            description_text=spec["body"],
            severity=spec["severity"].capitalize(),
            priority=spec["priority"].upper(),
            labels=spec["labels"],
        )
    if platform == "linear":
        return linear_bug_workflow_runner.create_bug(
            team_id=os.environ["LINEAR_TEAM_ID"],
            title=spec["title"],
            description_md=spec["body"],
            priority=PRIORITY_MAP[spec["priority"]],
            state_id=BACKLOG_STATE_ID,
            label_ids=resolve_label_ids(spec["labels"]),
        )
    if platform == "github":
        return github_issues_bug_workflow.create_bug(
            title=spec["title"],
            body=spec["body"],
            severity=spec["severity"],
            priority=spec["priority"],
            labels=spec["labels"],
        )
```

## Step 6 - Confirm and audit

After filing:

1. Capture the new bug's URL / identifier.
2. Append a comment to the CI run linking the bug.
3. Update a per-test "known failure" register so subsequent runs
   can correlate.

## Worked example - pytest + JUnit → GitHub Issues

```python
from pathlib import Path

failures = parse_junit(Path("results.xml"))
for f in failures:
    spec = {
        "title": f"Test failure: {f['test'].split('::')[-1]}",
        "body": render_body(f, env=collect_env_vars()),
        "severity": infer_severity(f["type"], f["message"]),
        "priority": "p3",  # default; reviewer adjusts
        "labels": ["bug", "auto-filed", "ci-failure"],
        "defect_type": "Code",
        "component": guess_component(f["test"]),
    }
    if find_dupes("github", f["test"]):
        # Comment on the existing issue
        continue
    issue = file_bug(spec, "github")
    print(f"Filed #{issue['number']}: {issue['html_url']}")
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hand-copying assertion to bug | Stack truncation, escaping errors | Always parse the structured artefact |
| One bug per test failure ignoring deduplication | Tracker fills with the same flake | Always run Step 4 (dedupe) |
| Inferring severity from test name | "test_critical_path_*" doesn't mean failure is critical | Infer from assertion class + message keywords |
| No reproduction section | Triager can't repro; bug bounces back | Always include Step 3's commit + command |
| File before deduplication | Same defect filed N times in N CI runs | Search first |
| No artefacts linked | Triager can't see what happened | Always link screenshots / videos / HAR |
| Inferred classification not flagged as a proposal | Triager assumes it's confirmed; bad data downstream | Always label classification fields as "proposed - triager confirms" |

## Limitations

- **Inference is heuristic.** Severity / type inference from
  exception class is approximate; a reviewer must confirm.
- **Schemas drift.** JUnit XML is informal (Ant convention); some
  test runners emit non-standard variants (Surefire's missing
  attributes, Playwright's extended fields). The parser must
  handle gracefully.
- **Coverage is per-test-failure.** Tests that crash before
  pytest catches them (segfault) produce no JUnit output - 
  pair with CI step-failure detection.
- **No root-cause inference.** Root cause (CTAL-TA) requires
  human investigation; the skill leaves the field blank for
  triager.
- **Platform-specific dedup correctness.** Each tracker has its
  own search semantics; false negatives possible.

## References

- JUnit XML de-facto schema - 
  [llg.cubic.org/docs/junit/](https://llg.cubic.org/docs/junit/)
  (community-curated canonical reference).
- Allure framework results format - 
  [docs.qameta.io/allure-report](https://docs.qameta.io/allure-report/).
- TestNG XML - [testng.org](https://testng.org/).
- Composed:
  `bug-lifecycle-reference`,
  `severity-vs-priority-reference`,
  `defect-taxonomy-istqb`.
- Backend skills:
  `jira-bug-workflow-runner`,
  `linear-bug-workflow-runner`,
  `github-issues-bug-workflow`.
