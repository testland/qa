# LambdaTest - vendor detail

Deep reference for `cloud-grid-e2e`. LambdaTest is a newer cloud-grid
provider with strong real-device coverage and a SmartUI visual-testing
add-on; like the others it exposes a W3C-compliant endpoint. Per
[lambdatest.com/support/docs/getting-started-with-lambdatest-automation](https://www.lambdatest.com/support/docs/getting-started-with-lambdatest-automation/)
(Cloudflare-protected; cite by stable URL).

## Auth + hub URL

```bash
export LT_USERNAME="your-username"
export LT_ACCESS_KEY="<access-key>"
```

Hub: `https://hub.lambdatest.com/wd/hub`. Capabilities can be generated
from the dashboard (lambdatest.com/capabilities-generator).

## Capabilities (W3C)

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
    "project": "my-app"
  }
}
```

## Full LT:Options table

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

## Python example

```python
import os
from selenium import webdriver

options = webdriver.EdgeOptions()
options.browser_version = "latest"
options.platform_name = "Windows 11"

lt_options = {
    "user": os.environ["LT_USERNAME"],
    "accessKey": os.environ["LT_ACCESS_KEY"],
    "build": os.environ.get("BUILD_TAG", "local"),
    "name": "Checkout on Edge",
    "project": "my-app",
    "console": "errors",
    "network": True,
    "video": True,
}

# Vendor caps must be set on Options BEFORE Remote() ([Selenium options]).
options.set_capability("LT:Options", lt_options)

driver = webdriver.Remote(
    command_executor="https://hub.lambdatest.com/wd/hub",
    options=options,
)

driver.get("https://example.com")
# test...

# report pass / fail; LambdaTest's JS-executor pattern is "lambda-<command>=..."
failed = False
driver.execute_script("lambda-status=" + ("failed" if failed else "passed"))
driver.quit()
```

## LambdaTest Tunnel

Per lambdatest.com/support/docs/lambda-tunnel - start the tunnel, then set
`LT:Options.tunnel: true` **and** `tunnelName: "my-tunnel"`:

```bash
./LT --user $LT_USERNAME --key $LT_ACCESS_KEY --tunnelName "my-tunnel"
```

## SmartUI integration

SmartUI handles visual regression alongside the functional test
(paid add-on; alternative to Percy / Chromatic in `qa-visual-regression`):

```python
driver.execute_script("smartui.takeScreenshot=login-page")
```

Screenshots compare against a baseline; differences are flagged in the
SmartUI dashboard. Approve the initial baseline or false positives flood
reports.

## Parsing results

Session reports: video (`video: true`), network HAR (`network: true`),
console logs (`console` level), per-step screenshots (`visual: true`),
SmartUI diffs (if configured). REST:

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
      - uses: actions/checkout@v6
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

## Vendor-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Confusing `tunnel` (boolean) with `tunnelName` (string) | Tunnel won't activate | Set both when using tunnel |
| Missing `project` field | Dashboard organisation suffers | Always set `project` |
| Non-W3C mode (`w3c: false`) | Parity issues; future versions remove it | Keep `w3c: true` (default) |
| SmartUI baseline never approved | False positives flood reports | Approve initial baseline; audit changes |

## Vendor-specific limitations

- Smaller real-device matrix than BrowserStack (improving).
- SmartUI requires additional licensing.
- Thinner docs on edge cases than the older competitors.
- Pricing is per-parallel-session vs per-minute; cost analysis depends on
  workload shape.

[Selenium options]: https://www.selenium.dev/documentation/webdriver/drivers/options/
