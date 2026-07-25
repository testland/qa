---
name: browserstack-automate
description: "Author and run E2E tests on BrowserStack Automate - cloud grid covering 3000+ real device + browser combinations. Covers BROWSERSTACK_USERNAME + ACCESS_KEY auth, hub URL https://hub-cloud.browserstack.com/wd/hub, W3C capabilities + bstack:options (projectName, buildName, sessionName), BrowserStackLocal for testing against localhost / internal environments, parallel session limits, and CI integration. Use for cross-browser regression on real devices + browsers - distinct from running a single test framework locally, and from a matrix runner limited to the browser engines bundled on the local machine."
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

Composes with `browser-matrix-strategy-reference` (in the
qa-compatibility plugin) for matrix planning.

## When to use

- Cross-browser regression across more breadth than Playwright's
  bundled engines support (real Safari iOS, IE11 legacy, niche
  Android devices, etc.).
- Tier-1 browser matrix coverage backed by SLA.
- Local-network applications testable from the cloud grid via
  BrowserStackLocal.

For **bundled-engine** matrix (Chromium / Firefox / WebKit on the
runner machine), use `browser-matrix-runner`.
For orchestration across local + cloud grids, use a dedicated
grid-orchestration layer.

## How to use

1. Export `BROWSERSTACK_USERNAME` + `BROWSERSTACK_ACCESS_KEY` from account settings.
2. Point any WebDriver client (Selenium, WebdriverIO, Nightwatch) at the hub URL `https://hub-cloud.browserstack.com/wd/hub`.
3. Build W3C capabilities with a `bstack:options` block (set `projectName`, `buildName`, `sessionName`), then run one suite end to end - see Worked example.
4. Report each session's pass / fail status back before `driver.quit()`, so the dashboard metrics stay accurate.
5. For localhost / internal targets, tunnel via BrowserStackLocal (below). For the full CI matrix workflow, parallel-session scaling, the exhaustive `bstack:options` table, and REST session retrieval, see [references/ci-and-scaling.md](references/ci-and-scaling.md).

## Authentication

Per BrowserStack Automate docs, set env vars:

```bash
export BROWSERSTACK_USERNAME="your-username"
export BROWSERSTACK_ACCESS_KEY="<access-key-from-account-settings>"
```

## Hub URL

```
https://hub-cloud.browserstack.com/wd/hub
```

Connect any WebDriver client (Selenium, WebdriverIO, Nightwatch)
to this URL with the standard `RemoteWebDriver`-style
construction.

## Capabilities (W3C)

Standard W3C fields - `browserName`, `browserVersion`, `platformName`
(or BrowserStack's non-standard `os` + `osVersion`) - plus a
`bstack:options` block for BrowserStack-specific settings:

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

The exhaustive `bstack:options` table (`debug`, `networkLogs`,
`consoleLogs`, `video`, `seleniumVersion`, ...) is in
[references/ci-and-scaling.md](references/ci-and-scaling.md).

## Worked example

Run one Selenium suite on the grid end to end - build capabilities,
create the remote driver, drive the test, report status, quit:

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

# mark the session pass / fail so the dashboard metrics are accurate
driver.execute_script(
    'browserstack_executor: {"action": "setSessionStatus", '
    '"arguments": {"status":"passed","reason":"Login redirected as expected"}}'
)
driver.quit()
```

(Modern WebDriver clients prefer constructing through options + a
capabilities dict; consult the chosen client's docs.) Use
`"status":"failed","reason":"..."` on failure - the session-status
call drives the BrowserStack dashboard's pass / fail metrics +
filtering.

## Local testing (BrowserStackLocal)

To run tests against localhost / internal environments, start the
tunnel and set `bstack:options.local = "true"` on the session:

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Credentials in code | Token leak | Env vars / secret store |
| All tests on every browser combo | Slow + expensive (plan-limited) | Tier the matrix - see `browser-matrix-strategy-reference` |
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
  `browser-matrix-strategy-reference`.
- Sibling skills:
  `saucelabs-automate`,
  `lambdatest-automate`,
  `selenium-grid-4-runner`.
