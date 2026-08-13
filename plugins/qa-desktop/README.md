# qa-desktop

Desktop application testing across Windows (FlaUI, WinAppDriver - direct or Appium-invoked), macOS (XCTest UI via qa-mobile's xcuitest-suite), Linux (AT-SPI), Electron (Playwright _electron API, incl. Spectron migration), and Qt (QtTest framework). The desktop-test-author agent detects the driver, scaffolds a fresh test project when none exists, and authors per-flow tests.

Choosing a driver for a concrete app - project-marker detection plus the
one-driver-per-app decision table - lives in
[desktop-test-strategy-reference](skills/desktop-test-strategy-reference/SKILL.md),
alongside the desktop test-review hazard checklist.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [desktop-test-strategy-reference](skills/desktop-test-strategy-reference/SKILL.md) | Reference catalog of desktop GUI test strategies across Windows (UIA), macOS (XCTest + Accessibility), Linux (AT-SPI), Electron, and Qt - including the project-marker driver decision table and the desktop test-review hazard checklist (screen-object encapsulation, locator stability, explicit waits, STA / foreground-lock / elevation) |
| skill | [electron-playwright](skills/electron-playwright/SKILL.md) | Authors Playwright `_electron` tests for packaged Electron apps; drives main process + renderer windows from one suite; includes the legacy Spectron reference + migration shopping list in references/spectron-migration.md |
| skill | [flaui-tests](skills/flaui-tests/SKILL.md) | Authors and runs FlaUI-based Windows UI tests - the .NET-native wrapper around Microsoft UI Automation (UIA2 + UIA3) with idiomatic C# API |
| skill | [winappdriver](skills/winappdriver/SKILL.md) | Authors and runs UI tests against the WinAppDriver UIA surface via both invocation paths - the direct Microsoft W3C-WebDriver service and the actively-maintained Appium 2.x wrapper (`windows:` gestures, PowerShell hooks) |
| skill | [qt-test-framework](skills/qt-test-framework/SKILL.md) | Authors and runs Qt Test - the first-party C++ in-process unit + GUI test framework for Qt 6 with QTEST_MAIN, QSignalSpy, and QBENCHMARK |
| agent | [desktop-test-author](agents/desktop-test-author.md) | Authors desktop UI tests end to end: detects the app type + driver via the strategy reference's decision table, scaffolds a fresh test project when none exists (driver-init fixture, screen-object skeleton with INPUT NEEDED markers, per-OS CI bootstrap), then authors one test file per user-flow spec composing the driver skills with xUnit / NUnit / MSTest harnesses |

macOS XCTest UI testing lives in qa-mobile's
[xcuitest-suite](../qa-mobile/skills/xcuitest-suite/SKILL.md) - same framework
as iOS; the macOS desktop delta (destination flags, TCC permissions) is its
references/macos.md.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-desktop@testland-qa
```
