# LambdaTest Automate CI, full capabilities, and SmartUI

Deep reference for `lambdatest-automate` SKILL.md. Consult when wiring
LambdaTest into CI, tuning the full `LT:Options` capability set, wiring
SmartUI visual regression, or pulling session artifacts via REST.

## Full LT:Options table

`LT:Options` carries LambdaTest-specific settings:

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

## SmartUI integration

LambdaTest SmartUI handles visual regression alongside the
functional test:

```python
driver.execute_script("smartui.takeScreenshot=login-page")
```

Smart screenshots compare against a baseline; differences flagged
in the SmartUI dashboard. See `qa-visual-regression` for
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

Match the matrix breadth to a tiered plan - see
`browser-matrix-strategy-reference` for tiering guidance.
