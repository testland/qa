# Per-format failure parsers

Each input is auto-detected by extension. The spine's Step 1 table lists the
formats and schema references; the parser bodies live here.

## JUnit XML

Emitted by pytest, JUnit, surefire, Playwright. The schema is informal but
stable (Apache Ant / xUnit family); the agreed-on tags are `testsuites`,
`testsuite`, `testcase`, `failure`, `error`, `skipped`, `system-out`,
`system-err`. The `failure` element's `type` attribute carries the assertion
class (e.g. `AssertionError`), per [llg.cubic.org/docs/junit/](https://llg.cubic.org/docs/junit/).

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

## Allure JSON

Allure stores per-test JSON files in `allure-results/`, per
[docs.qameta.io/allure-report](https://docs.qameta.io/allure-report/). Its
labels are first-class; harvest `severity`, `feature`, `suite`. Shape:

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

## Other formats

- **pytest `--tb=short` log**: line-oriented stdout/stderr; regex-driven.
- **Playwright HTML report**: parse `report.json` inside the HTML bundle.
- **TestNG XML**: JUnit-like tag shape, per [testng.org](https://testng.org/).
