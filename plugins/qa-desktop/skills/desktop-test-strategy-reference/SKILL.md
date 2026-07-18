---
name: desktop-test-strategy-reference
description: "Pure-reference catalog of desktop GUI test strategies across Windows, macOS, and Linux. Defines the three accessibility-tree backends (Microsoft UI Automation on Windows, Apple Accessibility / XCTest on macOS, AT-SPI on Linux), the wrapper-tools that drive each backend (WinAppDriver, Appium-Windows, XCUIApplication, AT-SPI clients), the cross-toolkit Electron + Qt paths, a per-OS decision matrix, the per-OS asynchronous-wait hierarchies (XCTest waitForExistence/XCTestExpectation/XCTWaiter, FlaUI Retry primitives, AT-SPI manual polling), per-OS parallel-test policy, foreground-lock and UAC / TCC / AT-SPI elevation hazards, and the Microsoft-blessed high-DPI / per-monitor test matrix. Use as the strategic reference before picking a desktop test stack - the per-tool skills in this plugin are the implementation arms."
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
skills in this plugin and by anyone choosing a desktop test stack.

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
which is what most QA toolchains in this plugin actually drive.

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
pages for the renderer. Legacy alternative (deprecated 2021):
Spectron - covered as a legacy reference in `electron-spectron`.

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

- `winappdriver` - WinAppDriver against UIA
- `appium-windows-driver` - Appium-Windows driver (newer
  WinAppDriver wrapping)
- `xctest-mac-desktop` - XCTest UI for macOS
- `at-spi-linux` - AT-SPI via dogtail / pyatspi
- `qt-test-framework` - QtTest in-process
- `electron-playwright` - Playwright `_electron` API
- `electron-spectron` - legacy reference for migrations

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
  see the `winappdriver` and `xctest-mac-desktop` SKILLs for
  GitHub-hosted vs self-hosted considerations.

## Asynchronous waits per OS

Every reliable desktop test routes UI polls through the driver's
retry primitive, never raw `Thread.Sleep` / `Task.Delay`. The three
backends ship distinct mechanisms.

**macOS - three-tier XCTest hierarchy** ([XCUIElement.waitForExistence][appwait1],
[Asynchronous Tests and Expectations][appwait2]):

[appwait1]: https://developer.apple.com/documentation/xctest/xcuielement/2879412-waitforexistence
[appwait2]: https://developer.apple.com/documentation/xctest/asynchronous-tests-and-expectations

| Mechanism | Use when |
|---|---|
| `waitForExistence(timeout:)` - boolean, fastest | Single existence check |
| `XCTestExpectation` + `waitForExpectations(timeout:)` | Custom predicate |
| `XCTWaiter` - multi-expectation, returns enum | Composing several conditions |

Predicate-based waits expose no polling-interval setting - prefer
`waitForExistence` for simple existence checks, escalate only when
the wait is on a custom predicate.

**Windows - FlaUI `Retry` primitives** ([FlaUI Retry wiki][flauiretry]) parameterise any UI
poll with explicit `timeout` and `interval` `TimeSpan` values.
Defaults are not documented - pass them explicitly. Typical
interval: 100 to 200ms (10ms hammers UIA; 1s hides 100ms races).

[flauiretry]: https://github.com/FlaUI/FlaUI/wiki/Retry

| Primitive | Use when |
|---|---|
| `Retry.WhileNull(func, timeout, interval)` | Element fetch |
| `Retry.WhileFalse(func, timeout, interval)` | Boolean state |
| `Retry.WhileException(func, timeout, interval)` | Transient throws during element creation |

**Linux - AT-SPI manual polling.** No built-in retry primitive; the
dogtail / pyatspi community pattern is an explicit `time.time()`
polling loop with `timeout` + `interval` (100 to 250ms balances
responsiveness against `at-spi2-registryd` D-Bus traffic).

## Concurrency: per-OS parallel-test policy

**macOS** - per [Apple - Running tests serially or in parallel][appleparallel],
parallelisation is opt-in. The cited page is under Apple's modern
`documentation/testing/` (Swift Testing) namespace; the same opt-in
design applies to XCTest test plans, which are configured in Xcode
(Edit Scheme → Test → Options → Execute in parallel on Simulator).
Tests sharing mutable state must opt out; performance bundles must
disable parallelisation (parallel introduces timing noise). On
macOS the Simulator clones spin per worker - real disk + RAM cost.

[appleparallel]: https://developer.apple.com/documentation/testing/parallelization

**Windows** - UIA is per-session: one AutomationElement tree per
interactive Windows session. Two workers in the same session race
for foreground (see below). Scaling: one runner per VM, or one
RDP / per-user session per worker.

**Linux** - `at-spi2-registryd` is bound to one D-Bus session.
Workers writing events into the same session race for focus.
Scaling: one Xvfb + dbus-launch per worker, or one container per
worker with its own session bus.

## Platform foreground + elevation hazards

The two failure classes most often misdiagnosed as "flaky tests"
on desktop are actually documented platform behaviours.

### Windows foreground-lock

Per [Microsoft - SetForegroundWindow][winsetfg] and
[Microsoft - LockSetForegroundWindow][winlockfg]:

[winsetfg]: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow
[winlockfg]: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-locksetforegroundwindow

`SetForegroundWindow` can be refused by Windows. The foreground
process can also call `LockSetForegroundWindow` to suppress
foreground transfer entirely. The system re-enables the transfer
when the user presses ALT or interacts with a background window - 
neither of which happens in CI. Modal dialogs and active menus
also suppress it. Symptoms in test logs: a click "succeeds" but
the next action observes the previous window.

Mitigations:

- Activate the app explicitly (`app.Activate()` in FlaUI,
  `app.activate()` in XCUITest, `pyatspi` window-activation event
  on Linux) before every Act that depends on focus.
- On CI Windows runners, disable foreground-lock for the test session:
  `HKEY_CURRENT_USER\Control Panel\Desktop\ForegroundLockTimeout = 0`.
- Avoid running other apps in the same session during the test.

### Windows UAC: the secure desktop is unreachable

Per the WinAppDriver maintainers
([issue #306][wad306], [issue #2033][wad2033]):

[wad306]: https://github.com/microsoft/WinAppDriver/issues/306
[wad2033]: https://github.com/microsoft/WinAppDriver/issues/2033

The UAC consent prompt renders on a **secure desktop** that lives
outside the standard accessibility tree. WinAppDriver / UIA cannot
interact with the consent button - by Windows design, not driver
bug. Three supported workarounds:

- Run the test session itself elevated (the simplest, the prevailing
  CI pattern); the UAC prompt then never appears for in-session
  privileged actions.
- Pre-disable UAC in the CI VM image (`EnableLUA=0` in the registry - locks the VM to test use only).
- Send `Alt+Y` / `Alt+N` keystrokes hoping the secure desktop has
  focus (unreliable and version-dependent; not recommended).

### macOS TCC privacy prompts

Per [Jamf - *Resetting Transparency, Consent, and Control Prompts
on macOS*][jamftcc]:

[jamftcc]: https://docs.jamf.com/technical-articles/Resetting_Transparency_Consent_and_Control_Prompts_on_macOS.html

TCC-gated prompts (Automation, Accessibility, Screen Recording,
Files & Folders) render out of the AUT process and cannot be
reliably driven by XCUITest. The supported pattern is to bring the
prompt back to a known state before the test:

```bash
tccutil reset Automation com.example.MyApp
tccutil reset Accessibility com.example.MyApp
tccutil reset ScreenCapture com.example.MyApp
```

Or, on managed CI fleets, pre-grant via an MDM PPPC (Privacy
Preferences Policy Control) profile so the prompt never appears.

### Linux: AT-SPI requires session-wide accessibility on

Per [dogtail on GitLab][dogtail] and the [Ubuntu DogtailTutorial][ubuntudogtail]:

[ubuntudogtail]: https://wiki.ubuntu.com/Testing/Automation/DogtailTutorial

On modern GNOME (X11 or Wayland), AT-SPI is off by default. Enable
it session-wide **before** launching the AUT:

```bash
gsettings set org.gnome.desktop.interface toolkit-accessibility true
```

This only takes effect for newly-spawned processes - start the AUT
after the gsettings call, not before. Accerciser is the GNOME
inspector and the canonical pre-write verification tool: walk the
tree in Accerciser before writing the first locator.

## High-DPI / per-monitor test matrix

Per [Microsoft - *High DPI Desktop Application Development on
Windows*][msdpi]:

[msdpi]: https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows

> "Common scenarios where display scale factors change include:
> multiple-monitor setups where each display has a different
> scale factor..."

Microsoft enumerates concrete test scenarios that desktop apps
must cover and that test matrices routinely miss:

| Scenario | What can break |
|---|---|
| Multi-display with different scale factors | Window placement, image asset selection (1x vs 2x), font hinting |
| Dock / undock with mixed DPI | Live scale-factor change events; window jumps to wrong monitor |
| Remote Desktop from high-DPI client to low-DPI host | Mouse hit-test coordinates, font rendering, accessibility-tree positions |
| Live scale-factor change (drag between monitors) | Per-monitor V2 awareness needed; otherwise app is bitmap-stretched |

The recommended awareness level for the AUT is **per-monitor V2**.
CI matrix: at minimum one mixed-DPI lane (2-monitor: 100% + 200%)
in addition to a single-monitor 100% lane. macOS Retina has
analogous behaviour (1x vs 2x asset selection); Linux per-monitor
scaling lands in GNOME 47+ but is still maturing.

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
  XCUIElement) is treated as a stable identifier in the
  `xctest-mac-desktop` SKILL.
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
- Apple - XCUIElement.waitForExistence ([appwait1][appwait1])
  and Asynchronous Tests and Expectations ([appwait2][appwait2]).
- Apple - Running tests serially or in parallel
  ([appleparallel][appleparallel]).
- Microsoft - SetForegroundWindow ([winsetfg][winsetfg]),
  LockSetForegroundWindow ([winlockfg][winlockfg]),
  High-DPI Desktop Application Development on Windows
  ([msdpi][msdpi]).
- WinAppDriver UAC issue threads ([wad306][wad306], [wad2033][wad2033]).
- FlaUI Retry wiki ([flauiretry][flauiretry]).
- Jamf - Resetting TCC prompts on macOS ([jamftcc][jamftcc]).
- at-spi2-core - [atspi2core][atspi2core].
- dogtail (Python AT-SPI client) - [dogtail][dogtail].
- Ubuntu DogtailTutorial - [ubuntudogtail][ubuntudogtail].
- Per-tool implementation SKILLs in this plugin:
  `winappdriver`, `appium-windows-driver`, `xctest-mac-desktop`,
  `at-spi-linux`, `qt-test-framework`, `electron-playwright`,
  `electron-spectron`.
- Web-side neighbour:
  `playwright-testing` - DOM-driving for browser apps (the contrast surface for
  desktop drivers).
- Architecture-pattern sibling:
  `object-model-patterns` (in the qa-test-review plugin) - Pattern 7 (Screen Object) is the desktop analog of POM and
  cites this skill for the backend substrate.
