# qa-desktop

Desktop application testing across Windows (WinAppDriver, Appium-Windows), macOS (XCTest UI, Apple Accessibility Inspector), Linux (AT-SPI), Electron (Playwright _electron API), and Qt (QtTest framework)

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | desktop-test-strategy-reference | S2 | Pure-reference catalog of desktop GUI test strategies across Windows (UIA), macOS (XCTest + Accessibility), Linux (AT-SPI), Electron, and Qt |
| skill | electron-spectron | S2 | Legacy reference for the deprecated Spectron framework; documents migration path to Playwright `_electron` |
| skill | electron-playwright | S1 | Authors Playwright `_electron` tests for packaged Electron apps; drives main process + renderer windows from one suite |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-desktop@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
