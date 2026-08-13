# BrowserStack Automate - vendor detail

Deep reference for `cloud-grid-e2e`. Consult when tuning the full
`bstack:options` set, running BrowserStackLocal, scaling parallel sessions,
or pulling session artifacts via REST.

BrowserStack Automate is a hosted Selenium / Playwright / Cypress grid
exposing 3000+ real device + browser combinations (iOS, Android, Windows,
macOS) via a WebDriver-compatible endpoint. Per
[browserstack.com/docs/automate/selenium](https://www.browserstack.com/docs/automate/selenium).
The umbrella skill covers the Selenium-style invocation; Playwright +
Cypress integrations follow a different (but similar) pattern documented
separately by BrowserStack.

## Auth + hub URL

```bash
export BROWSERSTACK_USERNAME="your-username"
export BROWSERSTACK_ACCESS_KEY="<access-key-from-account-settings>"
```

Hub: `https://hub-cloud.browserstack.com/wd/hub`.

## Capabilities (W3C)

Standard W3C fields - `browserName`, `browserVersion`, `platformName` (or
BrowserStack's non-standard `os` + `osVersion`) - plus a `bstack:options`
block:

```json
{
  "browserName": "Chrome",
  "browserVersion": "latest",
  "os": "Windows",
  "osVersion": "11",
  "bstack:options": {
    "projectName": "My App",
    "buildName": "PR-1234",
    "sessionName": "Login flow on Chrome Windows",
    "local": "false"
  }
}
```

## Full bstack:options table

Per BrowserStack docs (browserstack.com/automate/capabilities,
Cloudflare-protected; cite by stable URL):

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

## Session status

```python
driver.execute_script(
    'browserstack_executor: {"action": "setSessionStatus", '
    '"arguments": {"status":"passed","reason":"..."}}'
)
```

## BrowserStackLocal

Per browserstack.com/local-testing/automate - start the tunnel and set
`bstack:options.local = "true"` on the session:

```bash
./BrowserStackLocal --key "$BROWSERSTACK_ACCESS_KEY" --daemon start
./BrowserStackLocal --key "$BROWSERSTACK_ACCESS_KEY" --daemon stop
```

Or via Docker:

```bash
docker run --name bstacklocal -d --rm \
  browserstack/local --key "$BROWSERSTACK_ACCESS_KEY"
```

## Parallel session limits

Plans limit parallel sessions (typically 5-50). Queue overflow blocks
subsequent sessions until earlier ones complete. Match the worker pool to
the plan:

```python
from concurrent.futures import ThreadPoolExecutor

MAX_PARALLEL = 5  # match plan

with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as exe:
    for case in cases:
        exe.submit(run_case, case)
```

## Parsing results

Session reports include: session video, network HAR (if `networkLogs:
true`), browser console logs (per `consoleLogs` level), Selenium logs, and
visual-debugging screenshots at each command. Retrieve via REST:

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
`browser-matrix-strategy-reference` for how to tier the matrix so full runs
stay within the plan's parallel-session limit.

## Vendor-specific limitations

- Real-device sessions have 5-30s startup latency; build wait + retry
  around setup rather than treating the dashboard as live.
- BrowserStack adds + retires devices; tests pinned to specific versions
  may need updates.
