---
name: saucelabs-automate
description: "Author and run E2E tests on Sauce Labs - cloud grid for cross-browser + real-device testing with W3C WebDriver, Cypress, Playwright, and Appium support. Covers SAUCE_USERNAME + SAUCE_ACCESS_KEY auth, regional hub URLs (us-west-1 / us-east-4 / eu-central-1), W3C capabilities, sauce:options dict (build, name, screenResolution, tunnelName), Sauce Connect Proxy for internal-environment testing. Use for cross-browser regression with Sauce Labs as the cloud grid; complements BrowserStack + LambdaTest as alternative providers."
---

# saucelabs-automate

## Overview

Sauce Labs is one of the original cloud-grid providers (alongside
BrowserStack + LambdaTest). It exposes a W3C-compliant WebDriver
endpoint covering desktop + mobile browser combinations, with
strong Cypress / Playwright / Appium support.

Per
[docs.saucelabs.com/dev/test-configuration-options](https://docs.saucelabs.com/dev/test-configuration-options/).

Composes with `browser-matrix-strategy-reference` (in the
qa-compatibility plugin) for matrix planning.

## When to use

- Cross-browser regression with Sauce Labs as the chosen grid
  provider.
- Real-device testing via Sauce's mobile cloud.
- Internal-network apps via Sauce Connect Proxy.
- Comparison testing - Sauce + BrowserStack run the same suite to
  catch grid-specific flakes.

## Authoring

### Authentication

Per Sauce docs:

```bash
export SAUCE_USERNAME="oauth-...-..."
export SAUCE_ACCESS_KEY="<access-key-from-user-settings>"
```

### Hub URLs (regional)

```
US-West:  https://ondemand.us-west-1.saucelabs.com:443/wd/hub
US-East:  https://ondemand.us-east-4.saucelabs.com:443/wd/hub
EU-Central: https://ondemand.eu-central-1.saucelabs.com:443/wd/hub
```

Pick the region closest to your CI runner for lower latency.

### Capabilities (W3C)

Per Sauce config docs:

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

Standard W3C: `browserName`, `browserVersion`, `platformName`.

`sauce:options` carries Sauce-specific:

| Option | Purpose |
|---|---|
| `username` / `accessKey` | Credentials (can also be in URL) |
| `build` | Group sessions by CI build |
| `name` | Session label in dashboard |
| `screenResolution` | Default 1024×768; common: 1920×1080 |
| `tunnelName` | Sauce Connect Proxy tunnel reference (preferred over deprecated `tunnelIdentifier`) |
| `extendedDebugging` | Enable HAR + console + Selenium logs |
| `capturePerformance` | Browser performance metrics |
| `recordVideo` / `recordScreenshots` | Session capture |
| `tags` | Free-form tags for filtering |

Per Sauce docs the `browserVersion` accepts `"latest"`,
`"latest-1"`, etc. - version-relative pinning works across
release cycles.

### Python example

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

# Vendor caps must be set on Options BEFORE Remote(); driver.capabilities is a
# read-only result dict, so assigning to it afterwards is a no-op ([Selenium options]).
options.set_capability("sauce:options", sauce_options)

driver = webdriver.Remote(
    command_executor="https://ondemand.us-west-1.saucelabs.com:443/wd/hub",
    options=options,
)

driver.get("https://example.com")
# test...
driver.quit()
```

## Running

### Report session status

```python
# Sauce-specific JS executor to mark pass/fail
sauce_user = os.environ["SAUCE_USERNAME"]
sauce_key = os.environ["SAUCE_ACCESS_KEY"]
driver.execute_script(
    f"sauce:job-result={'passed' if not failed else 'failed'}"
)
```

Or via REST API: `PUT /rest/v1/{username}/jobs/{session_id}`.

### Sauce Connect Proxy

For internal-network apps:

```bash
# Download Sauce Connect 5 from saucelabs.com
./sc \
  --username $SAUCE_USERNAME \
  --access-key $SAUCE_ACCESS_KEY \
  --tunnel-name "my-internal-tunnel" \
  --region us-west-1
```

Then set `sauce:options.tunnelName: "my-internal-tunnel"` in
capabilities. Tunnel cleans up on Ctrl+C.

For ephemeral CI: spawn → wait-for-ready → run tests → terminate.

### Parallel session limits

Sauce plans cap concurrent (parallel) sessions by tier; throttle to
stay under your account's limit via `ThreadPoolExecutor` or the
CI-matrix `max-parallel` key.

## Parsing results

Per Sauce docs, session reports include:

- Session video (always - `recordVideo: true` default)
- Network HAR (if `extendedDebugging: true`)
- Browser console logs
- Selenium logs
- Screenshot per command (if `recordScreenshots`)
- Performance metrics (if `capturePerformance`)

Retrieve via REST:

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hardcoded region | Latency from CI to grid varies; cross-region adds 100ms+ | Match region to CI runner location |
| Missing `build` field | Dashboard unsearchable | Always set to CI build / PR identifier |
| `tunnelIdentifier` (deprecated) | Newer SC versions emit warnings | Use `tunnelName` |
| Polling for tunnel ready without timeout | Test suite hangs if SC never connects | Bounded wait + fail |
| Mixed regions in one test run | Increases flake | Pick one region per run |
| Not setting session status | Pass/fail metrics inaccurate | Always update status before quit |
| `recordVideo: false` to "save money" | Failed-session debugging hard | Keep `recordVideo: true` for failed sessions at minimum |

## Limitations

- **Regional differences.** Each region has its own device matrix +
  availability; some browsers / versions are region-specific.
- **Sauce Connect setup overhead.** Internal-environment testing
  needs SC tunnel; setup adds 10-30s to test-start.
- **Plan limits + queue overflow.** Sessions queue when parallel
  limit reached.
- **Video / artifact retention.** Free / lower-tier plans have
  short retention (often 7 days); paid plans extend.

## References

- Sauce Labs test config options - 
  [docs.saucelabs.com/dev/test-configuration-options](https://docs.saucelabs.com/dev/test-configuration-options/).
- Sauce Connect 5 docs - 
  [docs.saucelabs.com/secure-connections/sauce-connect-5](https://docs.saucelabs.com/secure-connections/sauce-connect-5/).
- Sauce Labs REST API - 
  docs.saucelabs.com/dev/api.
- W3C WebDriver specification - 
  [w3.org/TR/webdriver2/](https://www.w3.org/TR/webdriver2/).
- [Selenium options] - Selenium 4 browser-options classes;
  `set_capability` for vendor-prefixed caps before driver creation.
- Composes:
  `browser-matrix-strategy-reference`.
- Sibling skills:
  `browserstack-automate`,
  `lambdatest-automate`,
  `selenium-grid-4-runner`.

[Selenium options]: https://www.selenium.dev/documentation/webdriver/drivers/options/
