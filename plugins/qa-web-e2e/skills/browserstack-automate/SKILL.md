---
name: browserstack-automate
description: "Author and run E2E tests on BrowserStack Automate - cloud grid covering 3000+ real device + browser combinations. Covers BROWSERSTACK_USERNAME + ACCESS_KEY auth, hub URL https://hub-cloud.browserstack.com/wd/hub, W3C capabilities + bstack:options (projectName, buildName, sessionName), BrowserStackLocal for testing against localhost / internal environments, parallel session limits, and CI integration. Use for cross-browser regression on real devices + browsers - distinct from qa-web-e2e/playwright-testing (single-runner) and qa-compatibility/browser-matrix-runner (bundled engines only)."
rating: 23
d6: 4
---

# browserstack-automate

## Overview

BrowserStack Automate is a hosted Selenium / Playwright / Cypress
grid that exposes 3000+ real device + browser combinations (iOS,
Android, Windows, macOS) via a standard WebDriver-compatible
endpoint. Per
[browserstack.com/docs/automate/selenium](https://www.browserstack.com/docs/automate/selenium).

This skill wraps BrowserStack for **Selenium**-style invocation;
Playwright + Cypress integrations follow a different (but
similar) pattern documented separately by BrowserStack.

Composes with
[`browser-matrix-strategy-reference`](../../../qa-compatibility/skills/browser-matrix-strategy-reference/SKILL.md)
for matrix planning.

## When to use

- Cross-browser regression across more breadth than Playwright's
  bundled engines support (real Safari iOS, IE11 legacy, niche
  Android devices, etc.).
- Tier-1 browser matrix coverage backed by SLA.
- Local-network applications testable from the cloud grid via
  BrowserStackLocal.

For **bundled-engine** matrix (Chromium / Firefox / WebKit on the
runner machine), use
[`browser-matrix-runner`](../../../qa-compatibility/skills/browser-matrix-runner/SKILL.md).
For the orchestration agent that routes between local + cloud,
use [`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md).

## Authoring

### Authentication

Per BrowserStack Automate docs, set env vars:

```bash
export BROWSERSTACK_USERNAME="your-username"
export BROWSERSTACK_ACCESS_KEY="<access-key-from-account-settings>"
```

### Hub URL

```
https://hub-cloud.browserstack.com/wd/hub
```

Connect any WebDriver client (Selenium, WebdriverIO, Nightwatch)
to this URL with the standard `RemoteWebDriver`-style
construction.

### Capabilities (W3C)

Per BrowserStack docs:

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
    "local": "false",
    "debug": "true",
    "networkLogs": "true",
    "consoleLogs": "errors"
  }
}
```

Standard W3C fields: `browserName`, `browserVersion`, `platformName`
(or BrowserStack's `os` + `osVersion` non-standard).

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

### Python example (Selenium)

```python
import os
from selenium import webdriver

caps = {
    "browserName": "Safari",
    "browserVersion": "17",
    "os": "OS X",
    "osVersion": "Sonoma",
    "bstack:options": {
        "projectName": "my-app",
        "buildName": os.environ.get("BUILD_TAG", "local-run"),
        "sessionName": "Checkout flow on Safari macOS",
        "local": "false",
    },
}

driver = webdriver.Remote(
    command_executor=(
        f"https://{os.environ['BROWSERSTACK_USERNAME']}:"
        f"{os.environ['BROWSERSTACK_ACCESS_KEY']}"
        f"@hub-cloud.browserstack.com/wd/hub"
    ),
    options=webdriver.SafariOptions(),  # base options
)
# inject capabilities
for k, v in caps.items():
    driver.capabilities[k] = v

driver.get("https://example.com")
# ... test ...
driver.quit()
```

(Modern WebDriver clients prefer constructing through options + a
capabilities dict; consult the chosen client's docs.)

## Running

### Reporting session status back

After a test, mark the session pass / fail via BrowserStack's
REST API or via JS-executor:

```python
driver.execute_script(
    'browserstack_executor: {"action": "setSessionStatus", '
    '"arguments": {"status":"passed","reason":"Login redirected as expected"}}'
)
```

Or `"status":"failed","reason":"..."` on failure.

This drives the BrowserStack dashboard's pass / fail metrics +
filtering.

### Local testing (BrowserStackLocal)

To run tests against localhost / internal environments:

```bash
# Download the BrowserStackLocal binary from browserstack.com
./BrowserStackLocal --key "$BROWSERSTACK_ACCESS_KEY" --daemon start
# Sessions with bstack:options.local = "true" now tunnel
./BrowserStackLocal --key "$BROWSERSTACK_ACCESS_KEY" --daemon stop
```

Or via Docker:

```bash
docker run --name bstacklocal -d --rm \
  browserstack/local --key "$BROWSERSTACK_ACCESS_KEY"
```

### Parallel session limits

BrowserStack plans limit parallel sessions (typically 5-50 per
plan). Per their docs, queue overflow blocks subsequent sessions
until earlier ones complete. Plan accordingly:

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

Feed failure videos + HAR to
[`bug-report-from-failure`](../../../qa-defect-management/skills/bug-report-from-failure/SKILL.md)
for triage.

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Credentials in code | Token leak | Env vars / secret store |
| All tests on every browser combo | Slow + expensive (plan-limited) | Tier the matrix - see [`browser-matrix-strategy-reference`](../../../qa-compatibility/skills/browser-matrix-strategy-reference/SKILL.md) |
| Missing buildName | Sessions un-grouped in dashboard | Always set `buildName` to CI run / PR identifier |
| No session-status update | Dashboard pass/fail rate inaccurate | Always set session status before quit |
| BrowserStackLocal not stopped | Stale tunnels accumulate | Always `daemon stop` after test |
| Parallel exceeds plan limit | Sessions queue + timeout | Match `MAX_PARALLEL` to plan |
| Treating real-device dashboard as live | BrowserStack sessions can have minute-level setup latency | Build wait + retry around setup |

## Limitations

- **Cost.** Plan tiers limit parallel sessions; full-matrix runs
  on every PR can be expensive - tier the matrix.
- **Setup latency.** Real-device sessions have 5-30s startup;
  not optimal for short feedback loops.
- **Network shape.** Cloud-grid latency is higher than local;
  some timing-sensitive tests behave differently.
- **Real-device matrix changes.** BrowserStack adds + retires
  devices; tests pinned to specific versions may need updates.
- **Internal network requires BrowserStackLocal.** Adds setup +
  tunnel-stability concerns.

## References

- BrowserStack Automate Selenium docs - 
  [browserstack.com/docs/automate/selenium](https://www.browserstack.com/docs/automate/selenium).
- BrowserStack capabilities reference - 
  browserstack.com/automate/capabilities (Cloudflare-protected;
  cite by stable URL).
- BrowserStackLocal - 
  browserstack.com/local-testing/automate.
- W3C WebDriver specification - 
  [w3.org/TR/webdriver2/](https://www.w3.org/TR/webdriver2/).
- Composes:
  [`browser-matrix-strategy-reference`](../../../qa-compatibility/skills/browser-matrix-strategy-reference/SKILL.md).
- Sibling skills:
  [`saucelabs-automate`](../saucelabs-automate/SKILL.md),
  [`lambdatest-automate`](../lambdatest-automate/SKILL.md),
  [`selenium-grid-4-runner`](../../../qa-compatibility/skills/selenium-grid-4-runner/SKILL.md).
- Existing orchestrator:
  [`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md) - routes between local Selenium Grid + BrowserStack + Sauce
  Labs + LambdaTest.
