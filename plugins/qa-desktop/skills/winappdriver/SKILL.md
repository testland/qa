---
name: winappdriver
description: "Authors and runs Windows UI tests against WinAppDriver - Microsoft's W3C-WebDriver service for UWP, WPF, WinForms, and Win32 applications. Covers installing + launching `WinAppDriver.exe` on the default `127.0.0.1:4723` endpoint, declaring `app` / `platformName` / `appArguments` / `appTopLevelWindow` capabilities, finding elements by `AccessibilityId` / `Name` / `ClassName`, and CI integration on Windows runners. Use when driving a native Windows desktop app from a Selenium-style client (C#, Java, Python, Ruby, JavaScript)."
rating: 24
d6: 4
keywords:
  - windows
  - winappdriver
  - uia
  - webdriver
  - wpf
  - uwp
---

# winappdriver

## Overview

Per the [WinAppDriver repository][wad]:

[wad]: https://github.com/microsoft/WinAppDriver

> "Windows Application Driver (WinAppDriver) is a service to support
> Selenium-like UI Test Automation on Windows Applications."

WinAppDriver exposes Microsoft UI Automation (UIA) - the Windows
accessibility tree described in
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md) - behind a W3C-WebDriver-compatible HTTP endpoint. Per
[wad][wad], it supports four application classes on Windows 10:
"Universal Windows Platform (UWP)", "Windows Forms (WinForms)",
"Windows Presentation Foundation (WPF)", and "Classic Windows (Win32)
apps".

The driver is a **Microsoft-maintained service**, distinct from the
Appium ecosystem's wrapper around it - see
[`appium-windows-driver`](../appium-windows-driver/SKILL.md) for the
Appium proxy that sits in front of `WinAppDriver.exe` and adds
gestures, multi-window helpers, and PowerShell hooks. Pick this skill
when you want to talk to `WinAppDriver.exe` directly from a Selenium
client; pick `appium-windows-driver` when you want the Appium feature
surface.

## When to use

- Native Windows desktop app under test - UWP, WPF, WinForms, or
  Win32 ([wad][wad]).
- Selenium-style client already in the project (C# `WindowsDriver<T>`,
  Java `WindowsDriver`, Python `webdriver-windows`).
- Tests must drive system-installed apps (Notepad, Calculator,
  Settings) - `app` capability accepts an executable path or UWP
  application family name ([wadauth][wadauth]).
- Direct-to-`WinAppDriver.exe` is required (no Appium installation
  permitted on the test host).

For Qt-on-Windows out-of-process tests, this is the recommended
driver per
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md);
the Qt application must publish a usable `QAccessible` tree.

## Step 1 - Install + enable

Per [wad][wad]:

1. **Windows 10 machine** with the application under test installed.
2. **Enable Developer Mode** - Settings → Update & Security → For
   developers → Developer mode ([wad][wad]).
3. **Administrator privileges** are required to run on a custom
   IP / port ([wad][wad]); default `127.0.0.1:4723` runs as a normal
   user.

Download the latest WinAppDriver installer from the
[releases page][wad] (latest stable per [wad][wad]: v1.2.1, published
2020-11-05) and run it on the test machine. The installer drops
`WinAppDriver.exe` under `C:\Program Files (x86)\Windows Application
Driver\`.

## Step 2 - Launch the service

Per [wad][wad]:

```cmd
:: Default — 127.0.0.1:4723
"C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe"

:: Custom port (admin shell)
WinAppDriver.exe 4727

:: Bind to LAN IP (admin shell)
WinAppDriver.exe 10.0.0.10 4725

:: Bind to URL prefix (admin shell)
WinAppDriver.exe 10.0.0.10 4723/wd/hub
```

The service prints `Press ENTER to exit.` and listens for incoming
W3C-WebDriver session requests.

## Step 3 - Declare session capabilities

Per the [WinAppDriver authoring guide][wadauth]:

[wadauth]: https://github.com/microsoft/WinAppDriver/blob/master/Docs/AuthoringTestScripts.md

| Capability | Purpose |
|---|---|
| `app` | Application identifier (UWP family name) or full executable path ([wadauth][wadauth]) |
| `appArguments` | Launch arguments string ([wadauth][wadauth]) |
| `appWorkingDir` | Working directory for classic Win32 apps ([wadauth][wadauth]) |
| `appTopLevelWindow` | Hexadecimal handle of an existing window to attach to ([wadauth][wadauth]) |
| `platformName` | Target platform - set to `Windows` |
| `platformVersion` | Platform version string |

Per [wadauth][wadauth], the UWP Application Id appears in the
generated `AppX\vs.appxrecipe` file under the `RegisteredUserModeAppID`
node (example shape:
`c24c8163-548e-4b84-a466-530178fc0580_scyf5npe3hv32!App`).

## Step 4 - Author a test (C#)

The canonical example from [wadauth][wadauth]:

```csharp
using System;
using OpenQA.Selenium.Appium.Windows;
using OpenQA.Selenium.Remote;

var capabilities = new AppiumOptions();
capabilities.AddAdditionalCapability("app", @"C:\Windows\System32\notepad.exe");
capabilities.AddAdditionalCapability("appArguments", @"MyTestFile.txt");
capabilities.AddAdditionalCapability("appWorkingDir", @"C:\MyTestFolder\");
capabilities.AddAdditionalCapability("platformName", "Windows");

var session = new WindowsDriver<WindowsElement>(
    new Uri("http://127.0.0.1:4723"),
    capabilities);

// Locate by AccessibilityId (the AutomationId attribute)
var editor = session.FindElementByAccessibilityId("15");
editor.SendKeys("Hello from WinAppDriver");

session.Quit();
```

The `AccessibilityId` locator maps to the UIA `AutomationId` property - 
the stable locator per the
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
locator table.

## Step 5 - Element-locator strategies

Per [wadauth][wadauth]:

| C# / Java method | UIA attribute |
|---|---|
| `FindElementByAccessibilityId` | `AutomationId` |
| `FindElementByClassName` | `ClassName` |
| `FindElementById` | `RuntimeId` (decimal) |
| `FindElementByName` | `Name` |
| `FindElementByTagName` | `LocalizedControlType` |
| `FindElementByXPath` | any attribute (XPath over the UIA tree) |

To discover the right id during authoring, use **Inspect.exe** (ships
with the Windows SDK) or **Accessibility Insights for Windows** - 
both walk the same UIA tree the driver sees.

## Step 6 - Attaching to an already-running window

For tests where the app is launched externally:

```csharp
var capabilities = new AppiumOptions();
// Hex window handle from Inspect.exe / Spy++
capabilities.AddAdditionalCapability("appTopLevelWindow", "0xB822E2");
capabilities.AddAdditionalCapability("platformName", "Windows");
var session = new WindowsDriver<WindowsElement>(
    new Uri("http://127.0.0.1:4723"),
    capabilities);
```

Per [wadauth][wadauth], the `appTopLevelWindow` capability takes a
hex window handle. This is the path for testing apps that don't
support fresh-launch (apps with single-instance locks, or apps
requiring authenticated login flows that run outside the test).

## Step 7 - Run

```cmd
:: Build + test (NUnit example)
dotnet test --logger "trx;LogFileName=results.trx"

:: With session retry on flaky launches
dotnet test --filter "Category=Smoke" -- RunConfiguration.TestSessionTimeout=600000
```

Tests assume `WinAppDriver.exe` is running on `127.0.0.1:4723`. A
`Setup` fixture per test class should start the driver if it isn't
already, then dispose at `TearDown`.

## Step 8 - Parsing results

The C# Selenium client emits standard NUnit / MSTest / xUnit results
(TRX, XML, or JUnit depending on logger choice). Pair with
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
for the cross-runner aggregation pipeline.

## Step 9 - CI integration

Windows-only runner required - WinAppDriver does not run on Linux or
macOS:

```yaml
# .github/workflows/winappdriver.yml
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install WinAppDriver
        # Choco installs to default path + adds shortcut
        run: choco install winappdriver -y
      - name: Enable Developer Mode (Win 10/11 runners)
        run: |
          reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" `
            /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1
      - name: Start WinAppDriver
        run: |
          Start-Process -FilePath "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe" `
            -PassThru
          Start-Sleep -Seconds 3   # Let the service bind to 4723
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - name: Test
        run: dotnet test --logger "trx;LogFileName=results.trx"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: trx-results
          path: '**/results.trx'
```

WinAppDriver runs **interactive** - GitHub-hosted `windows-latest`
runners have an interactive session by default, but headless self-
hosted Windows containers need additional setup (the service refuses
to start under Session 0).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Locating by `FindElementByName` for localised apps | Element name changes per language | Use `AccessibilityId` (UIA `AutomationId`) - stable across locales ([wadauth][wadauth]) |
| Hard-coded screen coordinates via `MouseAction` | DPI / window-state / multi-monitor break | Resolve element via accessibility tree; the driver computes hit-test centre |
| Running tests with Developer Mode disabled | Session creation fails with cryptic error | Enable Developer Mode (Step 1) ([wad][wad]) |
| Custom IP / port without admin privileges | Service refuses to bind to non-default address | Run admin shell or stay on default `127.0.0.1:4723` ([wad][wad]) |
| One mega-session that drives multiple apps | UIA tree gets stale between app switches | One session per app; close + recreate on app change |
| Forgetting `session.Quit()` | Orphaned WinAppDriver child processes accumulate | `try/finally` around session lifecycle |
| Driving Edge / Chrome via WinAppDriver | Browser apps need a real WebDriver (Selenium / Playwright) | Use a browser driver, not WinAppDriver |
| Pixel-image matching for primary assertions | Brittle to font / theme / DPI changes | Accessibility tree first; image matching only for canvas-rendered content (per [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)) |

## Limitations

- **WinAppDriver is community-described as unmaintained** since
  ~2022 (per the
  [Appium ecosystem driver page][appiumdrivers] which states the
  upstream "has not been maintained since 2022"). The latest
  official release per [wad][wad] is v1.2.1 (2020-11-05). For new
  projects on actively-maintained tooling, see
  [`appium-windows-driver`](../appium-windows-driver/SKILL.md).

[appiumdrivers]: https://appium.io/docs/en/latest/ecosystem/drivers/

- **Windows-only.** The service runs only on Windows 10/11. No
  cross-OS test sharing without re-authoring against XCTest / AT-SPI.
- **No first-party Linux / macOS analogue.** Per the
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
  matrix, each OS has its own driver.
- **No headless mode.** UIA requires an interactive desktop session;
  CI on `windows-latest` works because GitHub-hosted runners are
  interactive, but Windows containers under Session 0 do not.
- **GPU / DirectComposition surfaces** (some WPF + WinUI 3 surfaces
  using DirectX-rendered controls) may not expose themselves to UIA - visible as opaque rectangles in Inspect.exe.
- **App must publish UIA.** Custom-painted Win32 windows that don't
  implement `IRawElementProviderSimple` are uncovered by
  WinAppDriver. Add UIA support or fall back to image matching for
  those specific surfaces.

## References

- WinAppDriver repository (README) - [wad][wad].
- WinAppDriver authoring guide - [wadauth][wadauth].
- Appium ecosystem drivers page (maintenance status note) - 
  [appiumdrivers][appiumdrivers].
- Sibling skill:
  [`appium-windows-driver`](../appium-windows-driver/SKILL.md) - the
  Appium proxy in front of WinAppDriver.
- Strategic frame:
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
