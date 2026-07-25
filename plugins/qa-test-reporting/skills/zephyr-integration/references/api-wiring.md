# Zephyr Scale batch sync, CI wiring, folders, and JUnit XML import

Deep reference for the zephyr-integration SKILL.md. Consult for the bounded-
concurrency batch helper, the full GitHub Actions workflow, Test Case folder /
label organization, and the bulk JUnit XML import alternative.

## Batch multiple results

The `/testexecutions` endpoint is per-execution. For batched POSTs,
the documented `/automations/executions` endpoint accepts a payload
that wraps multiple results - the exact shape is variant per Zephyr
Scale version. The conservative pattern is to retry per-execution
with bounded concurrency:

```python
from concurrent.futures import ThreadPoolExecutor

def post_all(cycle_key, results, max_concurrent=5):
    with ThreadPoolExecutor(max_workers=max_concurrent) as ex:
        list(ex.map(lambda r: post_execution(cycle_key, **r), results))
```

`max_concurrent=5` keeps under the rate limit (60 req/min on most
plans) for typical run sizes.

## Wire into CI

```yaml
- name: Run tests
  run: npm test -- --reporters=jest-junit

- name: Sync to Zephyr Scale
  if: always()
  env:
    ZEPHYR_TOKEN: ${{ secrets.ZEPHYR_TOKEN }}
    JIRA_PROJECT_KEY: 'CALC'
    BUILD_VERSION: ${{ github.sha }}
  run: python scripts/zephyr_sync.py junit.xml
```

The script:

1. Parses `junit.xml` (`junit-xml-analysis`).
2. Extracts Test Case keys (Map test methods to Zephyr Test Cases).
3. Opens a Test Cycle (Open a Test Cycle for the build).
4. Posts executions (Post execution results) with bounded concurrency
   (Batch multiple results, above).

## Folder + label organization

Zephyr Scale Test Cases live in folders. Two patterns:

- **Per-feature folder**: `Checkout/`, `Cart/`, `Auth/` - automated
  tests in those folders sync to Test Cases there.
- **Per-tier folder**: `Smoke/`, `Regression/`, `Edge cases/` - 
  automated tests carry a tier label that the sync script translates
  to folder.

The folder structure is created via the Zephyr UI; the sync script
references existing Test Case keys and doesn't create folders on
the fly.

## JUnit XML import (alternative path)

Zephyr Scale also accepts a JUnit XML file via the
`/automations/executions/junit` endpoint with a multipart body. This
is simpler than the per-execution sync but loses per-test
metadata (no comment, no execution time per case beyond what JUnit
XML carries):

```bash
curl -X POST "https://api.zephyrscale.smartbear.com/v2/automations/executions/junit?projectKey=$JIRA_PROJECT_KEY&autoCreateTestCases=true" \
  -H "Authorization: Bearer $ZEPHYR_TOKEN" \
  -F "file=@junit.xml"
```

Per-execution POST (Post execution results in the SKILL) is preferred
when comment / evidence matters; this JUnit XML import is the
lightweight default.
