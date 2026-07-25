---
name: lambdatest-automate
description: "Author and run E2E tests on LambdaTest - cloud grid for cross-browser + real-device testing with W3C WebDriver, Cypress, Playwright, and Appium support. Covers LT_USERNAME + LT_ACCESS_KEY auth, hub URL hub.lambdatest.com/wd/hub, W3C capabilities + LT:Options dict (build, name, project, smartUI, network, console, video, tunnel), LambdaTest Tunnel for internal apps. Use for cross-browser regression with LambdaTest as the cloud grid; complements BrowserStack + Sauce Labs."
---

# lambdatest-automate

## Overview

LambdaTest is a newer cloud-grid provider with strong real-device
coverage + Visual UI testing add-ons. Like BrowserStack + Sauce
Labs, it exposes a W3C-compliant endpoint.

Per
[lambdatest.com/support/docs/getting-started-with-lambdatest-automation](https://www.lambdatest.com/support/docs/getting-started-with-lambdatest-automation/)
(Cloudflare-protected; cite by stable URL).

Composes with `browser-matrix-strategy-reference` (in the
qa-compatibility plugin).

## When to use

- Cross-browser regression with LambdaTest as the chosen grid.
- Visual regression via LambdaTest's SmartUI (alternative to
  Percy / Chromatic in
  `qa-visual-regression`).
- Internal-network apps via LambdaTest Tunnel.
- Cost-comparison against BrowserStack / Sauce.

## How to use

1. Export `LT_USERNAME` + `LT_ACCESS_KEY`.
2. Point the WebDriver client at the hub URL `https://hub.lambdatest.com/wd/hub`.
3. Set vendor caps in an `LT:Options` dict on the Options object **before** creating the driver (`build`, `name`, `project`), then run one suite end to end - see Worked example.
4. Report each session's pass / fail with the `lambda-status` JS-executor before `driver.quit()`.
5. For internal apps, run LambdaTest Tunnel (below). For the full CI matrix workflow, the exhaustive `LT:Options` table, SmartUI visual regression, and REST session retrieval, see [references/ci-and-capabilities.md](references/ci-and-capabilities.md).

## Authentication

```bash
export LT_USERNAME="your-username"
export LT_ACCESS_KEY="<access-key>"
```

## Hub URL

```
https://hub.lambdatest.com/wd/hub
```

## Capabilities (W3C)

Standard W3C fields plus an `LT:Options` block for
LambdaTest-specific settings:

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

The exhaustive `LT:Options` table (`console`, `network`, `video`,
`visual`, `tunnel` / `tunnelName`, `smartUI.project`, ...) is in
[references/ci-and-capabilities.md](references/ci-and-capabilities.md).

## Worked example

Run one suite on the grid end to end - set vendor caps on the
Options object, create the remote driver, drive the test, report
status, quit:

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

# Set vendor caps on the Options object BEFORE creating the driver. In
# Selenium 4 W3C mode driver.capabilities is a read-only result dict, so
# assigning to it after Remote() is a no-op and LT:Options never applies
# (per the [Selenium options] docs).
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

For internal-network apps, start the tunnel, then set
`LT:Options.tunnel: true` and `tunnelName: "my-tunnel"`:

```bash
# Download from lambdatest.com/support/docs/lambda-tunnel
./LT --user $LT_USERNAME --key $LT_ACCESS_KEY --tunnelName "my-tunnel"
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
  [lambdatest.com/support/docs/getting-started-with-lambdatest-automation](https://www.lambdatest.com/support/docs/getting-started-with-lambdatest-automation/).
- LambdaTest capabilities generator - 
  lambdatest.com/capabilities-generator.
- LambdaTest Tunnel docs - 
  lambdatest.com/support/docs/lambda-tunnel.
- W3C WebDriver specification - 
  [w3.org/TR/webdriver2/](https://www.w3.org/TR/webdriver2/).
- [Selenium options] - Selenium 4 browser-options classes;
  `set_capability` for vendor-prefixed caps before driver creation.
- Composes:
  `browser-matrix-strategy-reference`.
- Sibling skills:
  `browserstack-automate`,
  `saucelabs-automate`,
  `selenium-grid-4-runner`.

[Selenium options]: https://www.selenium.dev/documentation/webdriver/drivers/options/
