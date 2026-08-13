---
name: desktop-test-strategy-reference
description: "Reference catalog of desktop GUI test strategies across Windows, macOS, and Linux. Defines the three accessibility-tree backends (Microsoft UI Automation on Windows, Apple Accessibility / XCTest on macOS, AT-SPI on Linux), the wrapper-tools that drive each backend, the cross-toolkit Electron + Qt paths, the project-marker detection table plus one-driver-per-app decision table (FlaUI / WinAppDriver / electron-playwright / QtTest / XCUITest / AT-SPI), an accessibility-first locator strategy, and a desktop test-review hazard checklist (screen-object encapsulation, locator stability, explicit waits, STA / foreground-lock / elevation). Deep operational detail (per-OS async-wait hierarchies, parallel-test policy, UAC / TCC / AT-SPI elevation hazards, the high-DPI matrix) lives in references/. Use when choosing how to test or automate a desktop GUI application on Windows, macOS, or Linux, or when reviewing an existing desktop UI test suite - the strategic reference ahead of the per-tool implementation skills."
metadata:
  keywords: "desktop, ui-automation, xctest, at-spi, electron, qt"
---

# desktop-test-strategy-reference

## Overview

Desktop GUI testing is fragmented along two axes: **operating system**
(Windows / macOS / Linux) and **UI toolkit** (native, Electron, Qt,
GTK, Cocoa, WPF, WinUI, Win32). Unlike the web - where a single
DOM-driving tool (Playwright / Selenium) covers every browser - each
desktop OS exposes its own accessibility tree, and that tree is the
substrate every reliable desktop test driver uses.

Per [Microsoft Learn - UI Automation Win32 overview][msuia]:

[msuia]: https://learn.microsoft.com/windows/win32/winauto/entry-uiauto-win32

> "Microsoft UI Automation is an accessibility framework that
> enables Windows applications to provide and consume programmatic
> information about user interfaces (UIs). … UI Automation also
> allows automated test scripts to interact with the UI."

Per [Apple - *Testing with Xcode*, UI Testing chapter][appleuit]:

[appleuit]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html

> "UI Testing rests upon two core technologies: the XCTest framework
> and Accessibility."

Per the [at-spi2-core project][atspi2core]:

[atspi2core]: https://gitlab.gnome.org/GNOME/at-spi2-core

> "Base DBus XML interfaces for accessibility, the accessibility
> registry daemon, and atspi library."

This skill is a **pure reference** consumed by the per-tool
skills below and by anyone choosing a desktop test stack.

## How to use this reference

1. **Pick OS + toolkit** from the per-OS / per-toolkit decision matrix.
2. **Choose stable locators** for that backend from the locator-strategy table.
3. **Apply the matching async-wait primitive** for the OS (XCTest waiters / FlaUI Retry / AT-SPI polling) - see [references/async-waits-and-concurrency.md](references/async-waits-and-concurrency.md).
4. **Pre-handle the OS elevation hazard** (UAC / TCC / AT-SPI) before it blocks the run - see [references/platform-hazards-and-dpi.md](references/platform-hazards-and-dpi.md).

## When to use

- Starting a new desktop test program - which OS + toolkit needs
  which driver?
- Auditing an existing desktop test suite - is the right backend
  in use, or is the suite working around a wrong-tool fit?
- Cross-platform desktop app (Electron, Qt, .NET MAUI) - which test
  tools cover which platforms?
- Onboarding a tester from web E2E - what's the mental-model
  difference between DOM-driving and accessibility-tree-driving?

## The three OS backends

Every reliable desktop driver routes through one of three OS-native
accessibility trees. Direct pixel / coordinate scripting (SikuliX,
AutoIt screen scraping) is in the **anti-pattern** column below.

### Windows - Microsoft UI Automation (UIA)

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
Appium-Windows projects expose UIA as a W3C WebDriver endpoint -
which is what most QA toolchains actually drive.

### macOS - Apple Accessibility + XCTest

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

### Linux - AT-SPI

The Linux desktop accessibility stack is **AT-SPI** (Assistive
Technology Service Provider Interface). Per [atspi2core][atspi2core],
the canonical implementation `at-spi2-core` provides "Base DBus XML
interfaces for accessibility, the accessibility registry daemon,
and atspi library." The registry daemon (`at-spi2-registryd`)
exposes a system-wide D-Bus service that assistive tools - and test
clients - connect to.

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

1. **Renderer process** - a normal Chromium DOM. Page-level
   Playwright / Selenium / Puppeteer drive this just like a browser
   tab.
2. **Main process** - the Node.js process that owns native windows,
   menus, IPC, file dialogs, lifecycle.

A **packaged** Electron app cannot be driven by browser-only
Playwright - the entry point is the packaged binary, not a URL. The
**Playwright `_electron` API** (`electron-playwright` SKILL in this
plugin) launches the packaged binary, exposes the main process as a
typed `ElectronApplication` handle, and returns Chromium-window
pages for the renderer. Legacy alternative (deprecated 2022):
Spectron - migration path in `electron-playwright`'s
references/spectron-migration.md.

### Qt

Qt has its own first-party test framework - **QtTest** - that lives
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
| Qt - in-process | QtTest (`QTEST_MAIN`) | QtTest | QtTest |
| Qt - out-of-process | WinAppDriver (via UIA) | XCTest UI | AT-SPI (via QAccessible) |
| Electron - renderer only | Playwright `_electron` page handle | Playwright `_electron` page handle | Playwright `_electron` page handle |
| Electron - main + IPC | Playwright `_electron` | Playwright `_electron` | Playwright `_electron` |

Cross-references to per-tool SKILLs:

- `winappdriver` - the Windows UIA WebDriver service, covering both the
  direct Selenium-client path and the Appium 2.x invocation path
- `xcuitest-suite` (qa-mobile plugin) - XCTest UI; its
  references/macos.md covers the macOS desktop delta
- AT-SPI on Linux - driven via dogtail / pyatspi clients (no dedicated
  skill; the backend and bootstrap are covered in this reference)
- `qt-test-framework` - QtTest in-process
- `electron-playwright` - Playwright `_electron` API; its
  references/spectron-migration.md covers legacy Spectron migrations

## Choosing a driver

To pick one driver for a concrete app, first infer the app type from the
project file - never from a bare directory name or README:

| Signal in project file | Inferred app type |
|---|---|
| `*.csproj` containing `<UseWPF>true</UseWPF>` or `<TargetFramework>...-windows</TargetFramework>` + `PresentationFramework` reference | `wpf` |
| `*.csproj` containing `<UseWindowsForms>true</UseWindowsForms>` | `winforms` |
| `*.csproj` containing `<TargetPlatformIdentifier>Windows</TargetPlatformIdentifier>` + UWP namespaces | `uwp` |
| `*.csproj` targeting `net48` / older with no UseWPF/UseWindowsForms | `win32` (managed Win32) |
| `package.json` with `"electron"` in `dependencies` or `devDependencies` | `electron` |
| `*.pro` file OR `CMakeLists.txt` with `find_package(Qt6)` / `find_package(Qt5)` | `qt` |
| `*.xcodeproj` / `Package.swift` targeting macOS | `macos-native` |
| `*.in` / `configure.ac` referencing GTK / GLib | `linux-gtk` |
| Avalonia or .NET MAUI references | `cross-platform-unknown` (host OS dictates the driver) |

Then apply the decision table - one primary driver per app; a secondary
fallback only where two are co-equal defensible (UWP, Win32, Qt):

| App type | Recommended driver | Why | Read next |
|---|---|---|---|
| `wpf` | **FlaUI** (UIA3) | .NET-native, idiomatic C# API, no HTTP hop; UIA3 is preferred for WPF per the FlaUI README | `flaui-tests` |
| `winforms` | **FlaUI** (UIA2) | Managed `System.Windows.Automation` has better legacy WinForms compatibility per the FlaUI README | `flaui-tests` |
| `uwp` / Store App | **FlaUI** (UIA3) OR **WinAppDriver** | FlaUI when the test stack is .NET; WinAppDriver when cross-language clients are required | `flaui-tests` or `winappdriver` |
| `win32` | **FlaUI** (UIA3) OR **WinAppDriver** | Either works; FlaUI for .NET test stack, WinAppDriver for Java / Python / Ruby clients | `flaui-tests` or `winappdriver` |
| `electron` | **electron-playwright** | Drives main + renderer from one Playwright suite via `_electron.launch` | `electron-playwright` |
| `qt` (Windows / Linux) | **qt-test-framework** in-process; **WinAppDriver** (Windows) or **AT-SPI** (Linux) out-of-process | First-party in-process tests use QtTest; out-of-process driving needs a UIA / AT-SPI client | `qt-test-framework` |
| `macos-native` | **XCUITest** | Apple's first-party UI test harness, accessibility-tree backed | `xcuitest-suite` (qa-mobile) + its references/macos.md |
| `linux-gtk` / `linux-qt` | **AT-SPI** (dogtail / Accerciser) | The canonical Linux accessibility-tree backend | the AT-SPI sections of this reference |
| `cross-platform-unknown` (Avalonia / MAUI) | Per-platform per row above | Avalonia / MAUI render via the host OS's UI toolkit, so the OS dictates the driver | per-platform skill |

Two constraints that flip or qualify a recommendation:

- **Elevation (Windows).** If the SUT requires admin privileges, the driver
  session itself must run elevated - UAC's secure desktop is outside the
  accessibility tree, so a non-elevated WinAppDriver / FlaUI session sees the
  entire elevated UI as empty ([WinAppDriver #306](https://github.com/microsoft/WinAppDriver/issues/306),
  [#2033](https://github.com/microsoft/WinAppDriver/issues/2033)). Signals:
  `<requestedExecutionLevel level="requireAdministrator" />` in `app.manifest`;
  README "Run as administrator."
- **Cross-OS Electron.** `electron-playwright` is the same driver across
  Windows / macOS / Linux (`_electron.launch()` + `electronApp.evaluate()` per
  the [Playwright ElectronApplication API](https://playwright.dev/docs/api/class-electronapplication));
  only the CI bootstrap differs per OS (see
  [references/platform-hazards-and-dpi.md](references/platform-hazards-and-dpi.md)).

Never mix UIA2 and UIA3 in the same FlaUI test process (unsupported per the
FlaUI README), and never emit one recommendation for "cross-platform desktop"
without a per-OS breakout - each OS has a different accessibility backend.

## Locator strategy across backends

The portable lesson from web E2E (per
`playwright-testing` in the qa-web-e2e plugin) - **accessibility-first locators** - carries directly over: every
desktop backend resolves elements through the same accessibility
tree assistive technology uses.

| Backend | Stable locator | Brittle locator |
|---|---|---|
| UIA (WinAppDriver, Appium-Windows) | `AutomationId` (preferred - locale-independent), `ControlType` + property combo (disambiguation when no AutomationId) | `Name` (last resort - Name **is the localised label**, fails across language packs); absolute screen coordinates; XPath (officially supported by WinAppDriver but the community-canonical guidance treats it as fragile and slow) |
| XCTest (macOS) | `accessibilityIdentifier`, role-based queries (`buttons["Submit"]`) | Label-based queries when the label is localised; image matching; hard-coded coordinates |
| AT-SPI (Linux) | Object `name` field set explicitly on the widget (GTK `widget.set_property('name', ...)`, Qt `QObject::setObjectName`) | Visible label or role-only queries (collapse under localisation and theme changes); pixel coordinates |
| QtTest in-process | Qt object name (`setObjectName("…")`) | child-index navigation through `QWidget` tree |
| Electron renderer (Playwright) | `getByRole` / `getByLabel` on the renderer DOM | CSS class chains; Electron debug-build internal IDs |

The single biggest portability win across desktop platforms is:
**every app under test sets a stable accessibility identifier on
every interactive widget.** Without it, the tree's only resolution
key is the human-visible label, which collapses under localisation.

**Localisation rule of thumb:** if the test passes on a US-English build
but the same app ships in 20 locales, every `Name` / label-based locator
is a latent failure. AccessibilityId / AutomationId / object name are
locale-independent by design - make the developer set them at the source.

## Coverage scope per layer

| Layer | What it can cover | What it cannot cover |
|---|---|---|
| Unit test (XCTest / QtTest / .NET MSTest) | Pure logic, view-model bindings, `QObject` signals | OS-level dialog interactions, IME input, multi-window focus |
| In-process UI test (XCUIApplication-in-app, QtTest with `QTest::mouseClick`) | App-internal widget events | Cross-app drag-drop, system shortcuts, OS file pickers |
| Out-of-process UI driver (WinAppDriver / AT-SPI / Playwright `_electron`) | Full end-to-end including file dialogs, menus, system tray | Pre-login OS UI, GPU-accelerated rendered surfaces (canvas, WebGL) that don't expose the accessibility tree |
| Visual snapshot | Pixel-level regressions, font rendering | Logic, state, async behaviour |

Cross-references for the upstream + downstream slots:

- Unit testing - see the per-language `qa-unit-tests-*` plugins.
- Visual regression - see
  `qa-visual-regression` for
  desktop screenshot comparison patterns.
- CI integration - desktop runners cost more than web runners;
  see `winappdriver` and qa-mobile's `xcuitest-suite`
  (references/macos.md) for GitHub-hosted vs self-hosted considerations.

## Operating the tests - deep references

Once the stack is chosen, the operational depth lives in two
companion references:

- **Asynchronous waits + concurrency** - per-OS retry primitives
  (XCTest waiters, FlaUI `Retry`, AT-SPI polling) and the per-OS
  parallel-test policy: [references/async-waits-and-concurrency.md](references/async-waits-and-concurrency.md).
- **Platform hazards + high-DPI** - foreground-lock, UAC secure
  desktop, macOS TCC prompts, AT-SPI session enablement, and the
  per-monitor DPI test matrix: [references/platform-hazards-and-dpi.md](references/platform-hazards-and-dpi.md).

## Review hazards - desktop test-code checklist

When reviewing an existing desktop UI test suite or a PR that touches desktop
test files, walk these four axes. For generic, framework-agnostic test-file
conventions (AAA, naming, magic numbers, assertion quality), use the
`test-code-critic` agent in qa-test-review - this checklist covers only the
desktop-specific hazards.

| Axis | What to flag |
|---|---|
| **Screen-object encapsulation** | Raw locator calls (`FindByAccessibilityId`, `FindFirstChild`, `XCUIApplication().descendants`, `findElementByAccessibilityId`) inside a test method instead of behind a Screen Object class (Pattern 7 in qa-test-review's `object-model-patterns`) |
| **Locator stability** | `FindByName` / `By.Name` where an AutomationId is available (per [Microsoft Learn - Use the AutomationID Property][msautoid], `AutomationIdProperty` "uniquely identifies a UI Automation element from its siblings"); XPath deeper than 2 levels; integer-index child navigation (`GetChildren()[2]`, `childAtIndex(1)`); locators composed from runtime string interpolation |
| **Explicit waits over sleep** | Any `Thread.Sleep` / `Task.Delay` / `time.sleep` in a test or screen-object body - replace with the per-OS retry primitive (FlaUI `Retry.WhileNull` / `WhileFalse` per the [FlaUI Retry wiki](https://github.com/FlaUI/FlaUI/wiki/Retry), XCTest `waitForExistence(timeout:)`, AT-SPI polling helper) - see [references/async-waits-and-concurrency.md](references/async-waits-and-concurrency.md) |
| **Platform hazards** | UIA event subscription from the test's main thread (STA threading); keyboard input without a preceding `app.Activate()` / `window.Focus()` (foreground-lock); elevation-requiring launches without an elevated-session note (UAC / TCC); AT-SPI tests that skip the `gsettings` + `Xvfb` / `dbus-launch` bootstrap - see [references/platform-hazards-and-dpi.md](references/platform-hazards-and-dpi.md) |

[msautoid]: https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-the-automationid-property

Hard-reject signal: a new test file where every element lookup is by Name or
index (zero AutomationId / accessibilityIdentifier usage) - locale-dependent
and structurally fragile; assign stable identifiers before authoring tests.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Image-recognition / pixel-matching as the primary driver (SikuliX-only, AutoIt screen scraping) | Brittle to font / theme / DPI / OS-chrome changes; opaque to localisation | Use the OS accessibility tree; reserve image matching for canvas-rendered content only |
| Hard-coded screen coordinates | Multi-monitor / DPI / window-state dependent | Resolve via accessibility identifier; click resolves to the element's hit-test centre |
| Win32 message sending (`SendMessage` / `PostMessage`) for modern apps | Doesn't reach UIA-only WinUI / WPF controls; bypasses event ordering | Route through UIA (WinAppDriver) - the documented control-pattern API |
| Using only XCTest on a packaged macOS app shipped to the App Store via TestFlight | Loses cross-platform consistency with Windows + Linux | Pair with a higher-level cross-platform layer (Appium Mac2 driver) only when the same test source must run on multiple OSes; otherwise XCTest is the right tool on macOS |
| Spectron for new Electron projects (archived 2022) | No maintenance, no support for modern Electron | Use Playwright `_electron` (`electron-playwright` SKILL) |
| Driving Qt apps with Win32-only tools when accessibility isn't wired in | Qt's `QAccessible` interface must be enabled; without it UIA sees no children | Verify with Accessibility Insights for Windows before writing tests; enable `QAccessible` in the Qt build |
| Running desktop UI tests on GitHub-hosted Linux runners with no virtual display | `at-spi2-registryd` requires a session bus | Self-hosted runners with a real (or `Xvfb` / `dbus-launch` synthetic) session, or use Windows / macOS hosted runners for those OS-specific suites |

## Limitations

- **Apple developer documentation is behind a Cloudflare-style
  challenge** on most "https://developer.apple.com/documentation/…"
  pages - automated fetches return the SPA shell only. This
  reference cites Apple's stable-archive `testing_with_xcode` chapter
  ([appleuit][appleuit]) for prose; per-API surface (XCUIApplication,
  XCUIElement) is treated as a stable identifier in qa-mobile's
  `xcuitest-suite` SKILL.
- **No single cross-platform driver.** Tools that claim to be one
  (Appium across Windows + macOS + Linux desktop) are thin facades
  over the per-OS backends - coverage gaps follow the underlying
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

- Microsoft UI Automation overview - [msuia][msuia].
- Apple *Testing with Xcode* - UI Testing chapter
  ([appleuit][appleuit]).
- at-spi2-core - [atspi2core][atspi2core].
- dogtail (Python AT-SPI client) - [dogtail][dogtail].
- Operational depth (with their own citations): async waits +
  concurrency in [references/async-waits-and-concurrency.md](references/async-waits-and-concurrency.md);
  foreground / elevation hazards + high-DPI matrix in
  [references/platform-hazards-and-dpi.md](references/platform-hazards-and-dpi.md).
- Per-tool implementation SKILLs:
  `winappdriver` (direct + Appium invocation), `qt-test-framework`,
  `electron-playwright` (incl. Spectron migration), and qa-mobile's
  `xcuitest-suite` (references/macos.md for the macOS desktop delta).
- Web-side neighbour:
  `playwright-testing` - DOM-driving for browser apps (the contrast surface for
  desktop drivers).
- Architecture-pattern sibling:
  `object-model-patterns` (in the qa-test-review plugin) - Pattern 7 (Screen Object) is the desktop analog of POM and
  cites this skill for the backend substrate.
