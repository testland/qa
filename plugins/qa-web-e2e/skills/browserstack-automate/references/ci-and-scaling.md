# BrowserStack Automate CI, scaling, and full capabilities

Deep reference for `browserstack-automate` SKILL.md. Consult when wiring
BrowserStack into CI, scaling parallel sessions to a plan limit, tuning the
full `bstack:options` capability set, or pulling session artifacts via REST.

## Full bstack:options table

Per BrowserStack docs (browserstack.com/automate/capabilities),
`bstack:options` carries BrowserStack-specific settings:

| Option | Purpose |
|---|---|
| `projectName` | Group sessions by project (dashboard organisation) |
| `buildName` | Group sessions by build / CI run |
| `sessionName` | Human-readable session label |
| `local` | "true" if testing localhost / internal via BrowserStackLocal |
| `debug` | Enable visual debugging (screenshots + DOM) |
| `networkLogs` | Capture HAR file |
| `consoleLogs` | "errors" / "warnings" / "info" / "verbose" |
| `video` | Default "true" - session video recording |
| `seleniumVersion` | Pin a Selenium version (e.g., "4.21.0") |

## Parallel session limits

BrowserStack plans limit parallel sessions (typically 5-50 per
plan). Per their docs, queue overflow blocks subsequent sessions
until earlier ones complete. Match the worker pool to the plan:

```python
from concurrent.futures import ThreadPoolExecutor

MAX_PARALLEL = 5  # match plan

with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as exe:
    for case in cases:
        exe.submit(run_case, case)
```

## Parsing results

BrowserStack session reports include:

- Session video (replay any failure)
- Network HAR (if `networkLogs: true`)
- Browser console logs (if `consoleLogs: errors|warnings|info|verbose`)
- Selenium logs
- Visual debugging (screenshots at each command)

Per the BrowserStack docs, retrieve sessions via REST API:

```bash
curl -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
  "https://api.browserstack.com/automate/sessions/<session-id>.json"
```

Feed failure videos + HAR to the from-CI-failure workflow in
`bug-report-template` (qa-bug-repro plugin) for triage.

## CI integration

```yaml
# .github/workflows/cross-browser.yml
on: pull_request
jobs:
  bstack:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser:
          - { name: Chrome, version: latest, os: Windows, osVersion: "11" }
          - { name: Safari, version: "17", os: "OS X", osVersion: Sonoma }
          - { name: Firefox, version: latest, os: Windows, osVersion: "11" }
          - { name: Edge, version: latest, os: Windows, osVersion: "11" }
    steps:
      - uses: actions/checkout@v5
      - name: Run cross-browser tests
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BSTACK_BROWSER: ${{ matrix.browser.name }}
          BSTACK_VERSION: ${{ matrix.browser.version }}
          BSTACK_OS: ${{ matrix.browser.os }}
          BSTACK_OS_VERSION: ${{ matrix.browser.osVersion }}
          BUILD_TAG: pr-${{ github.event.pull_request.number }}
        run: pytest tests/e2e/ --bstack
```

Match the matrix breadth to a tiered plan - see
`browser-matrix-strategy-reference` for how to tier the matrix so full
runs stay within the plan's parallel-session limit.
