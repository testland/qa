---
name: desktop-test-strategy-reference
description: "Pure-reference catalog of desktop GUI test strategies across Windows, macOS, and Linux. Defines the three accessibility-tree backends (Microsoft UI Automation on Windows, Apple Accessibility / XCTest on macOS, AT-SPI on Linux), the wrapper-tools that drive each backend (WinAppDriver, Appium-Windows, XCUIApplication, AT-SPI clients), the cross-toolkit Electron + Qt paths, and a per-OS decision matrix. Use as the strategic reference before picking a desktop test stack — the per-tool S1 skills in this plugin are the implementation arms."
archetype: S2
rating: 24
d6: 5
keywords:
  - desktop
  - ui-automation
  - xctest
  - at-spi
  - electron
  - qt
---

# desktop-test-strategy-reference

## Overview

Desktop GUI testing is fragmented along two axes: **operating system**
(Windows / macOS / Linux) and **UI toolkit** (native, Electron, Qt,
GTK, Cocoa, WPF, WinUI, Win32). Unlike the web — where a single
DOM-driving tool (Playwright / Selenium) covers every browser — each
desktop OS exposes its own accessibility tree, and that tree is the
substrate every reliable desktop test driver uses.

Per [Microsoft Learn — UI Automation Win32 overview][msuia]:

[msuia]: https://learn.microsoft.com/windows/win32/winauto/entry-uiauto-win32

> "Microsoft UI Automation is an accessibility framework that
> enables Windows applications to provide and consume programmatic
> information about user interfaces (UIs). … UI Automation also
> allows automated test scripts to interact with the UI."

Per [Apple — *Testing with Xcode*, UI Testing chapter][appleuit]:

[appleuit]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html

> "UI Testing rests upon two core technologies: the XCTest framework
> and Accessibility."

Per the [at-spi2-core project][atspi2core]:

[atspi2core]: https://gitlab.gnome.org/GNOME/at-spi2-core

> "Base DBus XML interfaces for accessibility, the accessibility
> registry daemon, and atspi library."

This skill is a **pure reference** consumed by the per-tool S1
skills in this plugin and by anyone choosing a desktop test stack.

## When to use

- Starting a new desktop test program — which OS + toolkit needs
  which driver?
- Auditing an existing desktop test suite — is the right backend
  in use, or is the suite working around a wrong-tool fit?
- Cross-platform desktop app (Electron, Qt, .NET MAUI) — which test
  tools cover which platforms?
- Onboarding a tester from web E2E — what's the mental-model
  difference between DOM-driving and accessibility-tree-driving?

## The three OS backends

Every reliable desktop driver routes through one of three OS-native
accessibility trees. Direct pixel / coordinate scripting (SikuliX,
AutoIt screen scraping) is in the **anti-pattern** column below.

### Windows — Microsoft UI Automation (UIA)

UI Automation (UIA) is Microsoft's accessibility framework for
Windows desktop applications, replacing the older Microsoft Active
Accessibility (MSAA) interface ([msuia][msuia]). UIA exposes an
`AutomationElement` tree with **control patterns** (`InvokePattern`,
`ValuePattern`, `SelectionPattern`, etc.) that describe what each
element does, not just how it looks.

Per [msuia][msuia]:

> "UI Automation is designed for experienced C/C++ developers. In
> general, developers need a moderate level of understanding about
> Component Object Model (COM) objects and interfaces, Unicode, and
> Windows API programming."

Higher-level language bindings (C#, PowerShell, Python via `pywinauto`)
sit on top. **For test-automation purposes**, the WinAppDriver and
Appium-Windows projects expose UIA as a W3C WebDriver endpoint —
which is what most QA toolchains in this plugin actually drive.

### macOS — Apple Accessibility + XCTest

macOS GUI testing uses the same `XCTest` framework that ships with
Xcode for unit and integration tests. Per [appleuit][appleuit]:

> "UI testing rests upon two core technologies: the XCTest
> framework and Accessibility."

The three foundational classes ([appleuit][appleuit]) are:

| Class | Role |
|---|---|
| `XCUIApplication` | The application under test |
| `XCUIElement` | A single UI element in the accessibility tree |
| `XCUIElementQuery` | A query that resolves to zero or more `XCUIElement` |

The general UI-test pattern per [appleuit][appleuit]:

> "Use an XCUIElementQuery to find an XCUIElement. Synthesize an
> event and send it to the XCUIElement. Use an assertion to compare
> the state of the XCUIElement against an expected reference state."

Xcode's **Accessibility Inspector** (bundled with Xcode → Xcode →
Open Developer Tool → Accessibility Inspector) is the read-side
companion: it walks the same tree the tests see, lets the engineer
verify accessibility identifiers exist before writing the query, and
flags WCAG-style accessibility gaps in the same pass.

### Linux — AT-SPI

The Linux desktop accessibility stack is **AT-SPI** (Assistive
Technology Service Provider Interface). Per [atspi2core][atspi2core],
the canonical implementation `at-spi2-core` provides "Base DBus XML
interfaces for accessibility, the accessibility registry daemon,
and atspi library." The registry daemon (`at-spi2-registryd`)
exposes a system-wide D-Bus service that assistive tools — and test
clients — connect to.

GTK applications expose AT-SPI automatically via the `atk` bridge
(`at-spi2-atk`); Qt applications expose AT-SPI via the
`QAccessible` infrastructure (see `qt-test-framework` SKILL for
the Qt-specific path); Electron and Chromium apps on Linux expose
their own AT-SPI surface.

Python clients ([dogtail][dogtail], `pyatspi`) and the GNOME
inspector tool **Accerciser** walk the registry to drive tests.

[dogtail]: https://gitlab.com/dogtail/dogtail

## The toolkit overlays

Two cross-toolkit families need explicit treatment because they
ride on top of (or around) the OS backends:

### Electron

Electron apps are Chromium + Node.js wrapped in a native window. They
expose two parallel surfaces:

1. **Renderer process** — a normal Chromium DOM. Page-level
   Playwright / Selenium / Puppeteer drive this just like a browser
   tab.
2. **Main process** — the Node.js process that owns native windows,
   menus, IPC, file dialogs, lifecycle.

A **packaged** Electron app cannot be driven by browser-only
Playwright — the entry point is the packaged binary, not a URL. The
**Playwright `_electron` API** (`electron-playwright` SKILL in this
plugin) launches the packaged binary, exposes the main process as a
typed `ElectronApplication` handle, and returns Chromium-window
pages for the renderer. Legacy alternative (deprecated 2021):
Spectron — covered as a legacy reference in `electron-spectron`.

### Qt

Qt has its own first-party test framework — **QtTest** — that lives
in the application's process and emits events directly into the
`QObject` event queue. It does **not** go through the OS
accessibility tree by default. For UI tests of Qt apps that need
to be driven from outside the process, the OS-native drivers
(WinAppDriver on Windows, XCTest on macOS, AT-SPI on Linux via
Qt's `QAccessible`) are the path. See `qt-test-framework` SKILL.

## Per-OS / per-toolkit decision matrix

| App type | Windows driver | macOS driver | Linux driver |
|---|---|---|---|
| Win32 / WinForms / WPF | WinAppDriver, Appium-Windows | n/a | n/a |
| WinUI 3 / UWP | WinAppDriver, Appium-Windows | n/a | n/a |
| Cocoa / SwiftUI / AppKit | n/a | XCTest UI (XCUIApplication) | n/a |
| GTK | n/a | n/a | AT-SPI (dogtail / pyatspi) |
| Qt — in-process | QtTest (`QTEST_MAIN`) | QtTest | QtTest |
| Qt — out-of-process | WinAppDriver (via UIA) | XCTest UI | AT-SPI (via QAccessible) |
| Electron — renderer only | Playwright `_electron` page handle | Playwright `_electron` page handle | Playwright `_electron` page handle |
| Electron — main + IPC | Playwright `_electron` | Playwright `_electron` | Playwright `_electron` |

Cross-references to per-tool S1 SKILLs:

- `winappdriver` — WinAppDriver against UIA
- `appium-windows-driver` — Appium-Windows driver (newer
  WinAppDriver wrapping)
- `xctest-mac-desktop` — XCTest UI for macOS
- `at-spi-linux` — AT-SPI via dogtail / pyatspi
- `qt-test-framework` — QtTest in-process
- `electron-playwright` — Playwright `_electron` API
- `electron-spectron` — legacy reference for migrations

## Locator strategy across backends

The portable lesson from web E2E (per
[`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md))
— **accessibility-first locators** — carries directly over: every
desktop backend resolves elements through the same accessibility
tree assistive technology uses.

| Backend | Stable locator | Brittle locator |
|---|---|---|
| UIA (WinAppDriver, Appium-Windows) | `AutomationId`, `Name`, `ControlType` | absolute screen coordinates, window-position-relative offsets |
| XCTest (macOS) | `accessibilityIdentifier`, role-based queries (`buttons["Submit"]`) | image matching, hard-coded coordinates |
| AT-SPI (Linux) | object name / role from the accessibility tree | pixel coordinates |
| QtTest in-process | Qt object name (`setObjectName("…")`) | child-index navigation through `QWidget` tree |
| Electron renderer (Playwright) | `getByRole` / `getByLabel` on the renderer DOM | CSS class chains; Electron debug-build internal IDs |

The single biggest portability win across desktop platforms is:
**every app under test sets a stable accessibility identifier on
every interactive widget.** Without it, the tree's only resolution
key is the human-visible label, which collapses under localisation.

## Coverage scope per layer

| Layer | What it can cover | What it cannot cover |
|---|---|---|
| Unit test (XCTest / QtTest / .NET MSTest) | Pure logic, view-model bindings, `QObject` signals | OS-level dialog interactions, IME input, multi-window focus |
| In-process UI test (XCUIApplication-in-app, QtTest with `QTest::mouseClick`) | App-internal widget events | Cross-app drag-drop, system shortcuts, OS file pickers |
| Out-of-process UI driver (WinAppDriver / AT-SPI / Playwright `_electron`) | Full end-to-end including file dialogs, menus, system tray | Pre-login OS UI, GPU-accelerated rendered surfaces (canvas, WebGL) that don't expose the accessibility tree |
| Visual snapshot | Pixel-level regressions, font rendering | Logic, state, async behaviour |

Cross-references for the upstream + downstream slots:

- Unit testing — see the per-language `qa-unit-tests-*` plugins.
- Visual regression — see
  [`qa-visual-regression`](../../../qa-visual-regression/) for
  desktop screenshot comparison patterns.
- CI integration — desktop runners cost more than web runners;
  see the `winappdriver` and `xctest-mac-desktop` SKILLs for
  GitHub-hosted vs self-hosted considerations.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Image-recognition / pixel-matching as the primary driver (SikuliX-only, AutoIt screen scraping) | Brittle to font / theme / DPI / OS-chrome changes; opaque to localisation | Use the OS accessibility tree; reserve image matching for canvas-rendered content only |
| Hard-coded screen coordinates | Multi-monitor / DPI / window-state dependent | Resolve via accessibility identifier; click resolves to the element's hit-test centre |
| Win32 message sending (`SendMessage` / `PostMessage`) for modern apps | Doesn't reach UIA-only WinUI / WPF controls; bypasses event ordering | Route through UIA (WinAppDriver) — the documented control-pattern API |
| Using only XCTest on a packaged macOS app shipped to the App Store via TestFlight | Loses cross-platform consistency with Windows + Linux | Pair with a higher-level cross-platform layer (Appium Mac2 driver) only when the same test source must run on multiple OSes; otherwise XCTest is the right tool on macOS |
| Spectron for new Electron projects (archived 2022) | No maintenance, no support for modern Electron | Use Playwright `_electron` (`electron-playwright` SKILL) |
| Driving Qt apps with Win32-only tools when accessibility isn't wired in | Qt's `QAccessible` interface must be enabled; without it UIA sees no children | Verify with Accessibility Insights for Windows before writing tests; enable `QAccessible` in the Qt build |
| Running desktop UI tests on GitHub-hosted Linux runners with no virtual display | `at-spi2-registryd` requires a session bus | Self-hosted runners with a real (or `Xvfb` / `dbus-launch` synthetic) session, or use Windows / macOS hosted runners for those OS-specific suites |

## Limitations

- **Apple developer documentation is behind a Cloudflare-style
  challenge** on most "https://developer.apple.com/documentation/…"
  pages — automated fetches return the SPA shell only. This
  reference cites Apple's stable-archive `testing_with_xcode` chapter
  ([appleuit][appleuit]) for prose; per-API surface (XCUIApplication,
  XCUIElement) is treated as a stable identifier in the
  `xctest-mac-desktop` SKILL.
- **No single cross-platform driver.** Tools that claim to be one
  (Appium across Windows + macOS + Linux desktop) are thin facades
  over the per-OS backends — coverage gaps follow the underlying
  backend's gaps.
- **GPU-accelerated content** (canvas, WebGL, custom-painted Qt
  widgets, Win32 DirectComposition surfaces) does not expose itself
  to the accessibility tree by default; any driver routed through
  the tree sees them as opaque rectangles.
- **Cross-process focus + window-Z order** is OS-policy-dependent
  (Windows foreground-lock, macOS Stage Manager); tests that assume
  a window is foreground often need explicit `app.activate()` calls.
- **Localisation collapses label-based locators.** The per-tool
  SKILLs all push toward `AutomationId` / `accessibilityIdentifier`
  / object name for this reason.

## References

- Microsoft UI Automation overview — [msuia][msuia].
- Apple *Testing with Xcode* — UI Testing chapter
  ([appleuit][appleuit]).
- at-spi2-core — [atspi2core][atspi2core].
- dogtail (Python AT-SPI client) — [dogtail][dogtail].
- Per-tool implementation SKILLs in this plugin:
  `winappdriver`, `appium-windows-driver`, `xctest-mac-desktop`,
  `at-spi-linux`, `qt-test-framework`, `electron-playwright`,
  `electron-spectron`.
- Web-side neighbour:
  [`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md)
  — DOM-driving for browser apps (the contrast surface for
  desktop drivers).
