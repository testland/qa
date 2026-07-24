---
name: appium-windows-driver
description: "Authors and runs Appium 2.x tests against the Windows driver - the actively-maintained Node.js proxy in front of Microsoft's WinAppDriver server. Covers `appium driver install windows`, capability declaration (`platformName: windows`, `appium:automationName: windows`, `appium:app`, `appium:appTopLevelWindow`, `appium:appArguments`), Windows-specific gestures (`windows: scroll`, `windows: clickAndDrag`, `windows: keys`), PowerShell prerun/postrun hooks, and CI integration. Use when the test stack already uses Appium for other platforms (iOS, Android, Mac2) and Windows support fits the existing Appium client + capability model."
metadata:
  keywords: "appium, windows, automation, uia, desktop"
---

# appium-windows-driver

## Overview

Per the [appium-windows-driver repository][awd]:

[awd]: https://github.com/appium/appium-windows-driver

> "Appium Windows Driver is a test automation tool for Windows
> devices and acts as a proxy to Microsoft's WinAppDriver server."

It is the **Appium-ecosystem wrapper** in front of Microsoft's
`WinAppDriver.exe` ([awd][awd]). The Node.js driver itself is
actively maintained - latest published per [awd][awd] is **v5.4.0**
(2026-05-15) - while the underlying WinAppDriver service is
described on the [Appium ecosystem driver page][appiumdrivers] as
"has not been maintained since 2022", which is why the wrapper now
includes a built-in installer (`appium driver run windows
install-wad`) to pin a known-good WinAppDriver version.

[appiumdrivers]: https://appium.io/docs/en/latest/ecosystem/drivers/

**Sibling differentiation:**
`winappdriver` drives the same UIA
surface directly via the Microsoft service - pick that skill if the
project does not already use Appium or wants no Node.js dependency
on the test host. Pick `appium-windows-driver` when the project
already runs Appium for iOS / Android / Mac2 (per
`desktop-test-strategy-reference`
for the Mac2 sibling) and Windows is the next platform to add.

## When to use

- Project already runs Appium 2.x for mobile + Mac2 - add Windows
  with the same client.
- Tests need Windows-specific gestures (`windows: scroll`,
  `windows: clickAndDrag`) beyond raw W3C WebDriver.
- Tests need to execute PowerShell at session boundaries (`appium:
  prerun` / `appium:postrun`).
- A consistent capability schema across platforms is more valuable
  than the no-Node-dependency simplicity of
  `winappdriver`.

## Step 1 - Install Appium + the Windows driver

Per [awd][awd]:

```bash
npm install -g appium
appium driver install windows
```

Then install the underlying WinAppDriver server via the driver-
provided helper ([awd][awd]):

```bash
appium driver run windows install-wad
# Or pin a version:
appium driver run windows install-wad 1.2.1
```

The helper downloads the pinned WinAppDriver installer to
`C:\Program Files (x86)\Windows Application Driver\` - the standard
Microsoft install path described in
`winappdriver`.

## Step 2 - Launch the Appium server

```bash
appium --port 4723
```

Standard Appium 2.x defaults - listens on `127.0.0.1:4723`. Sessions
to this port forward Windows-specific calls to the WinAppDriver
service, which Appium spawns automatically when the first session
is created.

## Step 3 - Declare session capabilities

Per [awd][awd]:

| Capability | Required | Notes |
|---|---|---|
| `platformName` | yes | "Must be set to `windows` (case-insensitive)" ([awd][awd]) |
| `appium:automationName` | yes | "Must be set to `windows` (case-insensitive)" ([awd][awd]) |
| `appium:app` | yes (unless attaching) | UWP app ID or full executable path ([awd][awd]) |
| `appium:appTopLevelWindow` | conditional | "The hexadecimal handle of an existing application top level window" ([awd][awd]) |
| `appium:appArguments` | optional | Argument string passed to the launched app ([awd][awd]) |
| `appium:prerun` | optional | PowerShell script run before session start ([awd][awd]) |
| `appium:postrun` | optional | PowerShell script run after session end ([awd][awd]) |

Example capability JSON:

```json
{
  "platformName": "windows",
  "appium:automationName": "windows",
  "appium:app": "C:\\Windows\\System32\\notepad.exe",
  "appium:appArguments": "MyTestFile.txt"
}
```

## Step 4 - Author a test (Python WebdriverIO-style)

```python
from appium import webdriver
from appium.options.windows import WindowsOptions
from selenium.webdriver.common.by import By

options = WindowsOptions()
options.platform_name = 'windows'
options.automation_name = 'windows'
options.app = r'C:\Windows\System32\notepad.exe'

driver = webdriver.Remote('http://127.0.0.1:4723', options=options)

editor = driver.find_element(By.NAME, 'Text editor')
editor.send_keys('Hello from Appium Windows')

driver.quit()
```

Locators (`AccessibilityId`, `Name`, `ClassName`, etc.) carry the
same UIA semantics as in `winappdriver` - 
the driver proxies them through to WinAppDriver unchanged.

## Step 5 - Windows-specific gestures

Per [awd][awd], the driver adds Windows-namespaced extensions on top
of the W3C WebDriver baseline:

| Command | Purpose |
|---|---|
| `windows: scroll` | "Mouse wheel gesture" with `deltaX` / `deltaY` parameters ([awd][awd]) |
| `windows: clickAndDrag` | "Drag-and-drop operations" ([awd][awd]) |
| `windows: keys` | "Customized keyboard input with virtual key codes" ([awd][awd]) |
| `windows: launchApp` | Open another app window within the same session ([awd][awd]) |

Example - scroll a list inside the app under test:

```python
driver.execute_script('windows: scroll', {
    'elementId': list_element.id,
    'deltaY': -300,   # negative scrolls down
})
```

Example - drag a file across panels:

```python
driver.execute_script('windows: clickAndDrag', {
    'startElementId': source.id,
    'endElementId':   target.id,
})
```

## Step 6 - Multi-window sessions

Per [awd][awd], "It is possible to switch between app windows using
WebDriver Windows API" and `windows: launchApp` "creates new app
windows within the same session". This is the cross-app workflow
path (e.g., test a deep-link flow that crosses from a desktop app
into the Settings app):

```python
settings_handle = driver.execute_script('windows: launchApp', {
    'app': 'ms-settings:',
})
driver.switch_to.window(settings_handle)
```

## Step 7 - Pre/post-run PowerShell hooks

Per [awd][awd], `appium:prerun` and `appium:postrun` accept
PowerShell scripts that the driver executes around session
lifecycle. This is the canonical place to:

- Set up fixture data (write a config file to the user's `%AppData%`).
- Suppress / replay the Windows lock screen if the app under test
  triggers a UAC prompt.
- Tear down user-data state between tests.

```json
{
  "platformName": "windows",
  "appium:automationName": "windows",
  "appium:app": "MyApp",
  "appium:prerun": {
    "script": "Copy-Item .\\fixtures\\config.json $env:APPDATA\\MyApp\\config.json -Force"
  },
  "appium:postrun": {
    "script": "Remove-Item $env:APPDATA\\MyApp\\config.json -Force"
  }
}
```

## Step 8 - Run + parse results

```bash
# Pytest example
pytest tests/windows --junitxml=reports/windows-junit.xml
```

JUnit XML output feeds
`junit-xml-analysis` (in the qa-test-reporting plugin)
for the cross-runner aggregation pipeline.

## Step 9 - CI integration

```yaml
# .github/workflows/appium-windows.yml
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm install -g appium
      - run: appium driver install windows
      - run: appium driver run windows install-wad
      - name: Enable Developer Mode
        run: |
          reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" `
            /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1
      - name: Start Appium
        run: |
          Start-Process -FilePath "appium" -ArgumentList "--port 4723" -PassThru
          Start-Sleep -Seconds 5
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install Appium-Python-Client pytest
      - run: pytest tests/windows --junitxml=reports/windows-junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: junit, path: reports/ }
```

Same hosted-vs-self-hosted runner caveats as
`winappdriver` - UIA requires an
interactive desktop session, so Session-0 Windows containers won't
work without extra display setup.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Omitting `appium:` prefix on driver capabilities | Appium 2.x requires the vendor prefix on non-W3C-standard caps | Always prefix (`appium:automationName`, `appium:app`, etc.) ([awd][awd]) |
| Targeting `automationName: WinAppDriver` (legacy) | Appium 2.x driver expects `windows`, case-insensitive | Use `windows` per [awd][awd] |
| Hand-installing a random WinAppDriver MSI | Version mismatch with the Node driver's proxy code | `appium driver run windows install-wad [version]` ([awd][awd]) |
| Running PowerShell hooks that block forever | Session creation hangs on the `prerun` script | Hooks must be short + non-interactive ([awd][awd]) |
| Hard-coded `appTopLevelWindow` checked into the repo | Hex window handle is per-launch, not stable | Discover at runtime via `windows: launchApp` or fresh-launch via `appium:app` |
| Mixing the Mac2 driver's capability shape on Windows | `appium:bundleId` (Mac2) isn't valid for Windows | Per-platform capability blocks; share only the W3C-standard caps |
| Using `windows: scroll` with positive `deltaY` to scroll down | Wheel-delta sign mirrors Windows convention | Negative `deltaY` scrolls down (Step 5) |

## Limitations

- **Windows-only.** The driver runs Appium against UIA on
  Windows 10/11. Cross-OS test sharing relies on parallel drivers
  (`mac2`, `xcuitest`, `uiautomator2`).
- **Underlying WinAppDriver maintenance gap.** Per
  [appiumdrivers][appiumdrivers], the WinAppDriver server "has not
  been maintained since 2022"; bugs in the UIA-to-WebDriver layer
  itself can only be patched in the Appium driver, not in the
  upstream service. NovaWindows is referenced on
  [appiumdrivers][appiumdrivers] as "a drop-in replacement for the
  partially unmaintained Windows driver" - consider for new heavy
  use.
- **Appium server overhead.** Adds a Node.js process layer in
  front of WinAppDriver - slightly slower session start than direct
  `winappdriver`. For tests where session
  startup time dominates (very short tests, large suites), direct
  WinAppDriver is faster.
- **PowerShell hooks run as the test user.** They cannot bypass UAC
  or other security boundaries; design fixtures around the test
  user's permissions.
- **Same UIA constraints as direct WinAppDriver.** GPU-rendered
  surfaces, DirectComposition, and apps that don't publish UIA are
  uncovered (see `winappdriver`
  limitations).

## References

- appium-windows-driver README - [awd][awd].
- Appium ecosystem drivers page - [appiumdrivers][appiumdrivers].
- Sibling skill (direct service): `winappdriver`.
- Strategic frame:
  `desktop-test-strategy-reference`.
- Downstream: `junit-xml-analysis`.
