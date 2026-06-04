# qa-desktop

Desktop application testing across Windows (FlaUI, WinAppDriver, Appium-Windows), macOS (XCTest UI, Apple Accessibility Inspector), Linux (AT-SPI), Electron (Playwright _electron API), and Qt (QtTest framework). Includes desktop-driver-selector, desktop-test-scaffolder, and desktop-test-author agents for cross-driver orchestration.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | desktop-test-strategy-reference | Pure-reference catalog of desktop GUI test strategies across Windows (UIA), macOS (XCTest + Accessibility), Linux (AT-SPI), Electron, and Qt |
| skill | electron-spectron | Legacy reference for the deprecated Spectron framework; documents migration path to Playwright `_electron` |
| skill | electron-playwright | Authors Playwright `_electron` tests for packaged Electron apps; drives main process + renderer windows from one suite |
| skill | flaui-tests | Authors and runs FlaUI-based Windows UI tests - the .NET-native wrapper around Microsoft UI Automation (UIA2 + UIA3) with idiomatic C# API |
| skill | winappdriver | Authors and runs UI tests against Microsoft WinAppDriver (W3C WebDriver for UWP, WPF, WinForms, and Win32 apps on Windows 10) |
| skill | appium-windows-driver | Authors Appium 2.x tests against the Windows driver - the Node.js proxy in front of WinAppDriver with `windows:` gestures and PowerShell hooks |
| skill | qt-test-framework | Authors and runs Qt Test - the first-party C++ in-process unit + GUI test framework for Qt 6 with QTEST_MAIN, QSignalSpy, and QBENCHMARK |
| skill | xctest-mac-desktop | Authors XCTest UI + unit tests for macOS apps with XCUIApplication / XCUIElement queries and `xcodebuild test` CI integration |
| skill | at-spi-linux | Authors Linux desktop tests via AT-SPI accessibility - dogtail for GTK + Qt apps, Accerciser for tree inspection, Xvfb + dbus-launch CI |
| agent | desktop-driver-selector | Reads a target desktop project (`csproj` / `package.json` / `.pro` / `CMakeLists.txt`) and emits one driver recommendation (FlaUI / WinAppDriver / electron-playwright / QtTest / XCUITest / AT-SPI) plus rationale |
| agent | desktop-test-scaffolder | Scaffolds a fresh desktop test project - test project file, driver-init module, one screen-object skeleton, and a CI workflow tagged for the matching Windows / macOS / Linux runner |
| agent | desktop-test-author | Authors one desktop UI test for one user flow given a spec + target app + chosen driver; composes FlaUI / WinAppDriver / Appium-Windows / electron-playwright / QtTest skills with xUnit / NUnit / MSTest harnesses |
| agent | desktop-test-reviewer | Adversarial read-only reviewer for existing desktop UI test files (WPF, WinForms, Electron, Qt, macOS); checks screen-object encapsulation, AutomationId locator stability, explicit-wait usage, and OS-platform hazards (STA threading, foreground-lock, UAC/TCC elevation); emits BLOCK or PASS |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-desktop@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
