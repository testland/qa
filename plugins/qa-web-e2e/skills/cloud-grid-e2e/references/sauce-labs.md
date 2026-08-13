# Sauce Labs - vendor detail

Deep reference for `cloud-grid-e2e`. Sauce Labs is one of the original
cloud-grid providers, with a W3C-compliant WebDriver endpoint covering
desktop + mobile browser combinations and strong Cypress / Playwright /
Appium support. Per
[docs.saucelabs.com/dev/test-configuration-options](https://docs.saucelabs.com/dev/test-configuration-options/).

Also worth knowing: running the same suite on Sauce + a second grid is a
practical way to catch grid-specific flakes.

## Auth + hub URLs (regional)

```bash
export SAUCE_USERNAME="oauth-...-..."
export SAUCE_ACCESS_KEY="<access-key-from-user-settings>"
```

```
US-West:    https://ondemand.us-west-1.saucelabs.com:443/wd/hub
US-East:    https://ondemand.us-east-4.saucelabs.com:443/wd/hub
EU-Central: https://ondemand.eu-central-1.saucelabs.com:443/wd/hub
```

Pick the region closest to your CI runner for lower latency. Each region
has its own device matrix + availability; mixing regions in one run adds
flake.

## Capabilities (W3C)

```json
{
  "browserName": "chrome",
  "browserVersion": "latest",
  "platformName": "Windows 11",
  "sauce:options": {
    "build": "PR-1234",
    "name": "Login flow on Chrome Windows",
    "username": "$SAUCE_USERNAME",
    "accessKey": "$SAUCE_ACCESS_KEY",
    "screenResolution": "1920x1080",
    "tunnelName": "my-internal-tunnel",
    "extendedDebugging": true,
    "capturePerformance": true,
    "recordVideo": true,
    "recordScreenshots": true,
    "tags": ["smoke", "e2e", "auth"]
  }
}
```

| `sauce:options` field | Purpose |
|---|---|
| `username` / `accessKey` | Credentials (can also be in URL) |
| `build` | Group sessions by CI build |
| `name` | Session label in dashboard |
| `screenResolution` | Default 1024x768; common: 1920x1080 |
| `tunnelName` | Sauce Connect tunnel reference (preferred over deprecated `tunnelIdentifier`) |
| `extendedDebugging` | Enable HAR + console + Selenium logs |
| `capturePerformance` | Browser performance metrics |
| `recordVideo` / `recordScreenshots` | Session capture |
| `tags` | Free-form tags for filtering |

`browserVersion` accepts `"latest"`, `"latest-1"`, etc. -
version-relative pinning works across release cycles.

## Python example

```python
import os
from selenium import webdriver

options = webdriver.FirefoxOptions()
options.browser_version = "latest"
options.platform_name = "Windows 11"

sauce_options = {
    "build": os.environ.get("BUILD_TAG", "local"),
    "name": "Checkout flow Firefox",
    "username": os.environ["SAUCE_USERNAME"],
    "accessKey": os.environ["SAUCE_ACCESS_KEY"],
    "screenResolution": "1920x1080",
    "extendedDebugging": True,
}

# Vendor caps must be set on Options BEFORE Remote() ([Selenium options]).
options.set_capability("sauce:options", sauce_options)

driver = webdriver.Remote(
    command_executor="https://ondemand.us-west-1.saucelabs.com:443/wd/hub",
    options=options,
)

driver.get("https://example.com")
# test...
driver.quit()
```

## Session status

```python
driver.execute_script("sauce:job-result=" + ("passed" if not failed else "failed"))
```

Or via REST API: `PUT /rest/v1/{username}/jobs/{session_id}`.

## Sauce Connect Proxy

Per
[docs.saucelabs.com/secure-connections/sauce-connect-5](https://docs.saucelabs.com/secure-connections/sauce-connect-5/):

```bash
# Download Sauce Connect 5 from saucelabs.com
./sc \
  --username $SAUCE_USERNAME \
  --access-key $SAUCE_ACCESS_KEY \
  --tunnel-name "my-internal-tunnel" \
  --region us-west-1
```

Then set `sauce:options.tunnelName: "my-internal-tunnel"` in capabilities.
Tunnel cleans up on Ctrl+C. For ephemeral CI: spawn → wait-for-ready →
run tests → terminate. SC tunnel setup adds 10-30s to test start.

## Parsing results

Session reports include: video (always - `recordVideo: true` default),
network HAR (if `extendedDebugging`), browser console logs, Selenium logs,
per-command screenshots (if `recordScreenshots`), performance metrics (if
`capturePerformance`). Retrieve via REST (docs.saucelabs.com/dev/api):

```bash
curl -u "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" \
  "https://api.us-west-1.saucelabs.com/rest/v1/$SAUCE_USERNAME/jobs/<session-id>"
```

## CI integration

```yaml
on: pull_request
jobs:
  sauce:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser:
          - { name: chrome, version: latest, platform: "Windows 11" }
          - { name: safari, version: "17", platform: "macOS 14" }
          - { name: edge, version: latest, platform: "Windows 11" }
    steps:
      - uses: actions/checkout@v6
      - name: Run on Sauce Labs
        env:
          SAUCE_USERNAME: ${{ secrets.SAUCE_USERNAME }}
          SAUCE_ACCESS_KEY: ${{ secrets.SAUCE_ACCESS_KEY }}
          SAUCE_BROWSER: ${{ matrix.browser.name }}
          SAUCE_VERSION: ${{ matrix.browser.version }}
          SAUCE_PLATFORM: ${{ matrix.browser.platform }}
          BUILD_TAG: pr-${{ github.event.pull_request.number }}
        run: pytest tests/e2e/ --sauce
```

## Vendor-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hardcoded region | Cross-region latency adds 100ms+ per command | Match region to CI runner location |
| `tunnelIdentifier` (deprecated) | Newer SC versions emit warnings | Use `tunnelName` |
| Mixed regions in one test run | Increases flake | Pick one region per run |
| `recordVideo: false` to "save money" | Failed-session debugging hard | Keep video for failed sessions at minimum |

## Vendor-specific limitations

- Video / artifact retention is short on free / lower tiers (often 7
  days); paid plans extend.

[Selenium options]: https://www.selenium.dev/documentation/webdriver/drivers/options/
