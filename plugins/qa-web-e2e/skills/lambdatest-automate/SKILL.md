---
name: lambdatest-automate
description: "Author and run E2E tests on LambdaTest - cloud grid for cross-browser + real-device testing with W3C WebDriver, Cypress, Playwright, and Appium support. Covers LT_USERNAME + LT_ACCESS_KEY auth, hub URL hub.lambdatest.com/wd/hub, W3C capabilities + LT:Options dict (build, name, project, smartUI, network, console, video, tunnel), LambdaTest Tunnel for internal apps. Use for cross-browser regression with LambdaTest as the cloud grid; complements BrowserStack + Sauce Labs."
rating: 22
d6: 4
archetype: S1
---

# lambdatest-automate

## Overview

LambdaTest is a newer cloud-grid provider with strong real-device
coverage + Visual UI testing add-ons. Like BrowserStack + Sauce
Labs, it exposes a W3C-compliant endpoint.

Per
[lambdatest.com/support/docs/automated-web-testing](https://www.lambdatest.com/support/docs/automated-web-testing/)
(Cloudflare-protected; cite by stable URL).

Composes with
[`browser-matrix-strategy-reference`](../../../qa-compatibility/skills/browser-matrix-strategy-reference/SKILL.md);
routed via
[`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md).

## When to use

- Cross-browser regression with LambdaTest as the chosen grid.
- Visual regression via LambdaTest's SmartUI (alternative to
  Percy / Chromatic in
  [`qa-visual-regression`](../../../qa-visual-regression/)).
- Internal-network apps via LambdaTest Tunnel.
- Cost-comparison against BrowserStack / Sauce.

## Authoring

### Authentication

```bash
export LT_USERNAME="your-username"
export LT_ACCESS_KEY="<access-key>"
```

### Hub URL

```
https://hub.lambdatest.com/wd/hub
```

### Capabilities (W3C)

```json
{
  "browserName": "Chrome",
  "browserVersion": "latest",
  "platformName": "Windows 11",
  "LT:Options": {
    "user": "$LT_USERNAME",
    "accessKey": "$LT_ACCESS_KEY",
    "build": "PR-1234",
    "name": "Login flow on Chrome Windows",
    "project": "my-app",
    "selenium_version": "4.21.0",
    "w3c": true,
    "console": "info",
    "network": true,
    "video": true,
    "visual": true,
    "tunnel": false,
    "tunnelName": "my-tunnel",
    "smartUI.project": "my-smartui-project"
  }
}
```

`LT:Options` carries LambdaTest-specific:

| Option | Purpose |
|---|---|
| `user` / `accessKey` | Credentials (alternative to env vars) |
| `build` | CI build / PR identifier |
| `name` | Session label |
| `project` | Group sessions by project (dashboard) |
| `selenium_version` | Pin Selenium version |
| `w3c` | Enable W3C mode (default true) |
| `console` | Console-log level: "errors" / "warnings" / "info" / "verbose" |
| `network` | Capture HAR file |
| `video` | Session recording |
| `visual` | Per-step screenshots |
| `tunnel` / `tunnelName` | LambdaTest Tunnel for internal apps |
| `smartUI.project` | Link to SmartUI visual-regression project |

### Python example

```python
import os
from selenium import webdriver

caps = {
    "browserName": "Edge",
    "browserVersion": "latest",
    "platformName": "Windows 11",
    "LT:Options": {
        "user": os.environ["LT_USERNAME"],
        "accessKey": os.environ["LT_ACCESS_KEY"],
        "build": os.environ.get("BUILD_TAG", "local"),
        "name": "Checkout on Edge",
        "project": "my-app",
        "console": "errors",
        "network": True,
        "video": True,
    },
}

driver = webdriver.Remote(
    command_executor="https://hub.lambdatest.com/wd/hub",
    options=webdriver.EdgeOptions(),
)
for k, v in caps.items():
    driver.capabilities[k] = v

driver.get("https://example.com")
# test...
driver.quit()
```

## Running

### Report session status

```python
driver.execute_script(
    "lambda-status=" + ("passed" if not failed else "failed")
)
```

LambdaTest's JS executor pattern is `"lambda-<command>=..."`.

### LambdaTest Tunnel

For internal-network apps:

```bash
# Download from lambdatest.com/support/docs/lambda-tunnel
./LT --user $LT_USERNAME --key $LT_ACCESS_KEY --tunnelName "my-tunnel"
```

Then set `LT:Options.tunnel: true` and `tunnelName: "my-tunnel"`.

### SmartUI integration

LambdaTest SmartUI handles visual regression alongside the
functional test:

```python
driver.execute_script("smartui.takeScreenshot=login-page")
```

Smart screenshots compare against a baseline; differences flagged
in the SmartUI dashboard. See
[`qa-visual-regression`](../../../qa-visual-regression/) for
visual-regression discipline.

## Parsing results

LambdaTest session reports:

- Session video (`video: true`)
- Network HAR (`network: true`)
- Browser console logs (`console: "verbose"`)
- Per-step screenshots (`visual: true`)
- SmartUI diffs (if SmartUI configured)

REST API:

```bash
curl -u "$LT_USERNAME:$LT_ACCESS_KEY" \
  "https://api.lambdatest.com/automation/api/v1/sessions/<session-id>"
```

## CI integration

```yaml
on: pull_request
jobs:
  lambdatest:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser:
          - { name: Chrome, version: latest, platform: "Windows 11" }
          - { name: Firefox, version: latest, platform: "Windows 11" }
          - { name: Safari, version: "17", platform: "macOS Sonoma" }
    steps:
      - uses: actions/checkout@v5
      - name: Run on LambdaTest
        env:
          LT_USERNAME: ${{ secrets.LT_USERNAME }}
          LT_ACCESS_KEY: ${{ secrets.LT_ACCESS_KEY }}
          LT_BROWSER: ${{ matrix.browser.name }}
          LT_VERSION: ${{ matrix.browser.version }}
          LT_PLATFORM: ${{ matrix.browser.platform }}
          BUILD_TAG: pr-${{ github.event.pull_request.number }}
        run: pytest tests/e2e/ --lambdatest
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Confusing `tunnel` (boolean) with `tunnelName` (string) | Tunnel won't activate | Set both when using tunnel |
| Missing `project` field | Dashboard organisation suffers | Always set `project` |
| Default `w3c: false` (old mode) | W3C parity issues; future versions remove non-W3C | Always set `w3c: true` (default) |
| Polling for tunnel ready without timeout | Test suite hangs | Bounded wait |
| Hardcoded LambdaTest URL in tests | Switching grids requires code changes | Abstract via env-var-driven config |
| SmartUI baseline never approved | False positives flood reports | Approve initial baseline; audit changes |
| Treating LambdaTest as drop-in replacement for BrowserStack | Caps shape differs (`LT:Options` vs `bstack:options`) | Use a small abstraction layer in test harness |

## Limitations

- **Smaller real-device matrix than BrowserStack.** Device coverage
  improving but still less broad.
- **Visual UI testing is paid add-on.** SmartUI requires
  additional licensing.
- **Less mature documentation.** Some edge cases (specific
  browser versions, mobile-real-device-only features) have thinner
  docs than competitors.
- **Pricing model differs.** Per-parallel-session vs per-minute;
  cost analysis depends on workload shape.

## References

- LambdaTest automated web testing - 
  [lambdatest.com/support/docs/automated-web-testing](https://www.lambdatest.com/support/docs/automated-web-testing/).
- LambdaTest capabilities generator - 
  lambdatest.com/capabilities-generator.
- LambdaTest Tunnel docs - 
  lambdatest.com/support/docs/lambda-tunnel.
- W3C WebDriver specification - 
  [w3.org/TR/webdriver2/](https://www.w3.org/TR/webdriver2/).
- Composes:
  [`browser-matrix-strategy-reference`](../../../qa-compatibility/skills/browser-matrix-strategy-reference/SKILL.md).
- Sibling skills:
  [`browserstack-automate`](../browserstack-automate/SKILL.md),
  [`saucelabs-automate`](../saucelabs-automate/SKILL.md),
  [`selenium-grid-4-runner`](../../../qa-compatibility/skills/selenium-grid-4-runner/SKILL.md).
- Routed by:
  [`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md).
