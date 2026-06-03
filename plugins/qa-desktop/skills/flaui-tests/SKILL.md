---
name: flaui-tests
description: "Authors and runs FlaUI-based Windows UI tests - the .NET-native wrapper around Microsoft UI Automation (UIA2 + UIA3). Covers the `FlaUI.Core` / `FlaUI.UIA2` / `FlaUI.UIA3` NuGet packages, `Application.Launch` / `Application.Attach` lifecycles, `ConditionFactory` + `FindFirstDescendant` locator patterns, `Retry` waits, and xUnit / NUnit / MSTest harness integration. Use when the test stack is C# / .NET-first and the team wants idiomatic in-process UIA calls rather than the HTTP/JSON wire protocol of `winappdriver` or the Appium proxy layer of `appium-windows-driver`."
rating: 25
d6: 4
d7: 1
keywords:
  - flaui
  - uia
  - dotnet
  - windows
  - wpf
  - winforms
---

# flaui-tests

## Overview

Per the [FlaUI repository README][flaui]:

[flaui]: https://github.com/FlaUI/FlaUI

> "FlaUI is a .NET library for automated UI testing of Windows
> applications."

FlaUI wraps Microsoft UI Automation (UIA) - the Windows accessibility
tree described in
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md) - behind an idiomatic C# API. Per [flaui][flaui], the library supports
"Win32, WinForms, WPF, and Store Apps" via two UIA bindings:
**UIA2** (managed `System.Windows.Automation`, per
[Microsoft Learn - UI Automation Overview][msuia2]) and **UIA3** (COM
interop). v5.0.0 was released February 2025 ([flaui][flaui]); the
project is MIT-licensed and remains actively maintained.

[msuia2]: https://learn.microsoft.com/dotnet/framework/ui-automation/ui-automation-overview

### Disambiguation - FlaUI vs winappdriver vs appium-windows-driver

FlaUI is a **.NET library** that links into the test process and
calls UIA directly. By contrast:

- [`winappdriver`](../winappdriver/SKILL.md) is a Microsoft-maintained
  **HTTP/JSON service** that exposes a W3C-WebDriver endpoint on
  `127.0.0.1:4723`; tests speak Selenium-style protocol over the wire
  and the driver is language-agnostic.
- [`appium-windows-driver`](../appium-windows-driver/SKILL.md) is an
  Appium 2.x proxy that sits in front of `WinAppDriver.exe` and adds
  gestures / multi-window helpers.

Pick FlaUI when the test stack is already C# / .NET-first and you
want in-process UIA calls without an HTTP hop. Pick `winappdriver`
when you need a Selenium client in another language. Pick
`appium-windows-driver` when you want the Appium feature surface on
top of WinAppDriver.

## When to use

- Test code lives in a C# / .NET project alongside the application
  (a `dotnet test` solution).
- Application under test is WPF, WinForms, Win32, or a Windows Store
  app - the four classes FlaUI documents support for ([flaui][flaui]).
- The team prefers strongly-typed control wrappers (`AsButton()`,
  `AsTextBox()`) over WebDriver's stringly-typed locators.
- No HTTP wire protocol required between test and driver
  (in-process testing minimises a moving part).

For cross-language test stacks (Java / Python / Ruby clients), use
[`winappdriver`](../winappdriver/SKILL.md) instead.

## Authoring

### NuGet packages

Per [flaui][flaui], three packages cover the surface:

| Package | Purpose |
|---|---|
| `FlaUI.Core` | Base library - element abstractions, `Application`, `ConditionFactory`, `Retry`, control patterns |
| `FlaUI.UIA3` | COM-based UIA binding - recommended for WPF and Store Apps ([flaui][flaui]) |
| `FlaUI.UIA2` | Managed UIA binding using `System.Windows.Automation` ([msuia2][msuia2]) - better legacy WinForms compatibility ([flaui][flaui]) |

Reference both `FlaUI.Core` and one of UIA2 / UIA3 from the test
project. Mixed-mode authoring (UIA2 and UIA3 in the same process) is
unsupported - see [FlaUInspect][flauinspect] which requires the
inspector mode to be picked at startup.

[flauinspect]: https://github.com/FlaUI/FlaUInspect

### Launching the application under test

Per the [FlaUI wiki - Application page][flauiapp]:

[flauiapp]: https://github.com/FlaUI/FlaUI/wiki/Application

```csharp
using FlaUI.Core;
using FlaUI.UIA3;

// Launch a fresh process
var app = Application.Launch(@"C:\Path\To\MyApp.exe");

// Attach to an already-running process by name or PID
var existing = Application.Attach("MyApp");

// Best-effort: attach if running, launch otherwise
var aol = Application.AttachOrLaunch(new ProcessStartInfo(@"C:\Path\To\MyApp.exe"));

// For a Windows Store app, pass the AUMID
var store = Application.LaunchStoreApp("Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");

using var automation = new UIA3Automation();
var window = app.GetMainWindow(automation);
```

Per [flauiapp][flauiapp]: "When the application object is disposed,
the application itself is closed as well." Pair the `Application`
lifecycle with the test harness's fixture scope so child processes
are cleaned up after each test class.

### Finding elements with ConditionFactory

Per the [FlaUI wiki - Searching page][flauisearch]:

[flauisearch]: https://github.com/FlaUI/FlaUI/wiki/Searching

```csharp
// Lambda form — preferred for readability
var loginButton = window.FindFirstDescendant(cf => cf.ByAutomationId("LoginButton"));

// ConditionFactory form
var loginButton2 = window.FindFirstDescendant(ConditionFactory.ByAutomationId("LoginButton"));

// Property + tree-scope form
var loginButton3 = window.FindFirst(
    TreeScope.Descendants,
    new PropertyCondition(
        Automation.PropertyLibrary.Element.AutomationIdProperty,
        "LoginButton"));
```

All three resolve to the same UIA query. The lambda form is the
shortest and is the convention in upstream samples. Per
[flauisearch][flauisearch], FlaUI exposes `FindFirstChild` /
`FindAllChildren` (immediate children only),
`FindFirstDescendant` / `FindAllDescendants` (full subtree),
and `FindFirstNested` / `FindAllNested` (multi-level condition
arrays).

Available condition constructors include `ByAutomationId`,
`ByName`, `ByText`, `ByClassName`, `ByControlType`, and boolean
combinators `AndCondition`, `OrCondition`, `NotCondition`
([flauisearch][flauisearch]).

Locator-selection order (most stable first):

1. `ByAutomationId` - `AutomationId` is a developer-set stable
   identifier per [msuia2][msuia2]; locale-independent and
   theme-independent.
2. `ByControlType` + nested condition - when no AutomationId is
   available, pair the control type (Button / Edit / ListItem) with
   another property.
3. `ByName` - last resort; localised apps change `Name` per language.

### Interacting with elements

Per [flaui][flaui]:

```csharp
// Strongly-typed wrappers
var button = window.FindFirstDescendant(cf => cf.ByAutomationId("Submit")).AsButton();
button.Invoke();

var textbox = window.FindFirstDescendant(cf => cf.ByAutomationId("Username")).AsTextBox();
textbox.Enter("alice@example.com");

var listbox = window.FindFirstDescendant(cf => cf.ByControlType(ControlType.List)).AsListBox();
listbox.Select(2);
```

`AsButton().Invoke()` calls the UIA `InvokePattern` on the element - 
the accessibility-canonical "press" action, distinct from a synthetic
mouse click ([msuia2][msuia2] §Control Patterns).

### Waits with the Retry class

Per the [FlaUI wiki - Retry page][flauiretry]:

[flauiretry]: https://github.com/FlaUI/FlaUI/wiki/Retry

> "Before v2.0.0, some Find methods included automatic retries; this
> responsibility now falls to developers."

```csharp
// Wait until the element appears
var found = Retry.WhileNull(
    () => window.FindFirstDescendant(cf => cf.ByAutomationId("StatusLabel")),
    timeout: TimeSpan.FromSeconds(10),
    interval: TimeSpan.FromMilliseconds(200),
    throwOnTimeout: true,
    ignoreException: true).Result;

// Wait until the element disappears
Retry.WhileTrue(
    () => window.FindFirstDescendant(cf => cf.ByAutomationId("Spinner")) is not null,
    timeout: TimeSpan.FromSeconds(30));
```

`Retry.WhileNull` / `Retry.WhileTrue` / `Retry.WhileFalse` /
`Retry.WhileException` are the four variants ([flauiretry][flauiretry]).
Each returns a `RetryResult` carrying iteration count, duration, and
the last value - the test can assert on those metrics when
diagnosing slow-loading screens.

### Waits with Application.WaitWhileBusy

Per the [FlaUI `Application` source][flauiappsrc]:

[flauiappsrc]: https://github.com/FlaUI/FlaUI/blob/master/src/FlaUI.Core/Application.cs

> "Waits as long as the application is busy. An optional timeout. If
> null is passed, the timeout is infinite. Returns true if the
> application is idle, false otherwise."

```csharp
public bool WaitWhileBusy(TimeSpan? waitTimeout = null)
```

Use it after a launch or a window-level action (menu open, modal
dismiss, dialog confirm) before driving the next element - it blocks
on the Win32 message-pump-idle signal of the target process. Pair
with `WaitWhileMainHandleIsMissing` right after `Launch` so the test
doesn't race the splash screen:

```csharp
var app = Application.Launch(@"C:\Path\To\InvoiceApp.exe");
app.WaitWhileMainHandleIsMissing(TimeSpan.FromSeconds(10));
app.WaitWhileBusy(TimeSpan.FromSeconds(10));

var window = app.GetMainWindow(automation);
window.FindFirstDescendant(cf => cf.ByAutomationId("Save")).AsButton().Invoke();
app.WaitWhileBusy(TimeSpan.FromSeconds(5)); // wait for save handler
```

`Retry.*` waits on *element-level* conditions (descendant appears /
disappears / matches a predicate); `WaitWhileBusy` waits on the
*process-level* idle signal. Both belong in the same test - pick by
what you can actually observe.

## Running

### Test framework integration

FlaUI integrates with any .NET test runner - xUnit, NUnit, MSTest:

```csharp
// xUnit collection fixture for one-time app launch per test class
public class LoginAppFixture : IDisposable
{
    public Application App { get; }
    public UIA3Automation Automation { get; }
    public LoginAppFixture()
    {
        App = Application.Launch(@"C:\Path\To\LoginApp.exe");
        Automation = new UIA3Automation();
    }
    public void Dispose()
    {
        Automation.Dispose();
        App.Close();
        App.Dispose();
    }
}

public class LoginTests : IClassFixture<LoginAppFixture>
{
    private readonly LoginAppFixture _fx;
    public LoginTests(LoginAppFixture fx) => _fx = fx;

    [Fact]
    public void Logs_in_with_valid_credentials()
    {
        var window = _fx.App.GetMainWindow(_fx.Automation);
        window.FindFirstDescendant(cf => cf.ByAutomationId("User")).AsTextBox().Enter("alice");
        window.FindFirstDescendant(cf => cf.ByAutomationId("Pass")).AsTextBox().Enter("secret");
        window.FindFirstDescendant(cf => cf.ByAutomationId("Login")).AsButton().Invoke();
        Assert.NotNull(window.FindFirstDescendant(cf => cf.ByAutomationId("Welcome")));
    }
}
```

For per-test app launch (slower but isolates state), put `Launch` /
`Close` in the test method itself; for per-class launch (faster but
shared state), use `IClassFixture` (xUnit) / `[OneTimeSetUp]` (NUnit)
/ `[ClassInitialize]` (MSTest). Pair authoring conventions with
[`xunit-tests`](../../../qa-unit-tests-net/skills/xunit-tests/SKILL.md),
[`nunit-tests`](../../../qa-unit-tests-net/skills/nunit-tests/SKILL.md),
or [`mstest-tests`](../../../qa-unit-tests-net/skills/mstest-tests/SKILL.md)
for the matching harness idioms.

### STA threading

UIA calls in UIA3 (COM interop) require an STA thread per
[msuia2][msuia2] (COM apartment model). xUnit defaults to MTA;
configure STA via the test runner attribute:

```csharp
// xUnit — install Xunit.StaFact and use [StaFact]
[StaFact]
public void Fact_running_on_sta_thread() { /* ... */ }

// NUnit — use [Apartment]
[Test, Apartment(ApartmentState.STA)]
public void Test_running_on_sta_thread() { /* ... */ }

// MSTest — STA is default; no attribute needed for sync tests
```

UIA2 (managed) is more permissive on threading, but mixed-threading
bugs are easier to debug if all UIA work happens on STA.

### `dotnet test` invocation

```cmd
:: Build + run
dotnet test --logger "trx;LogFileName=results.trx"

:: With a filter on the FlaUI smoke suite
dotnet test --filter "Category=Smoke" --logger "trx;LogFileName=smoke.trx"
```

## Parsing results

xUnit / NUnit / MSTest emit standard TRX / JUnit XML output via the
test logger flag. Pair with
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
for cross-runner aggregation.

For interactive selector discovery during authoring, use
[FlaUInspect][flauinspect] - per its README it is "based on FlaUI"
and presents the UIA tree with AutomationId, Name, ControlType, and
XPath fields. Pre-built `FlaUInspect.UIA2` and `FlaUInspect.UIA3`
binaries are downloadable from the releases page; pick the build
matching the UIA mode used by the test project.

## CI integration

Windows runner required - UIA is Windows-only per [msuia2][msuia2]:

```yaml
# .github/workflows/flaui.yml
jobs:
  ui-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - name: Build app under test
        run: dotnet build src/MyApp -c Release
      - name: Run FlaUI tests
        run: dotnet test tests/MyApp.UiTests --logger "trx;LogFileName=ui.trx"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: trx-results
          path: '**/ui.trx'
```

`windows-latest` provides an interactive desktop session by default - 
required because UIA cannot drive Session-0 / non-interactive
desktops. Self-hosted Windows-container runners need additional
setup (interactive logon + Auto-Login + an unlocked desktop).

### UIA2 vs UIA3 selection

Per [flaui][flaui]:

| Choose | When |
|---|---|
| **UIA3** | WPF / Store Apps / new code - COM-based, fewer compatibility gaps with modern controls |
| **UIA2** | Legacy WinForms / older Win32 - managed `System.Windows.Automation` ([msuia2][msuia2]) handles some legacy controls UIA3 misses |

For new projects, UIA3 is the default recommendation
([flaui][flaui]). UIA2 remains supported as a peer binding; FlaUI
itself ships both packages.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Thread.Sleep(2000)` between actions | Test runtime balloons; still flaky on slow CI | Use `Retry.WhileNull` / `Retry.WhileTrue` with explicit timeout per [flauiretry][flauiretry] |
| `FindFirstByXPath("//Button[@Name='Save']")` | Brittle to UI tree restructuring | Use `ByAutomationId` first; XPath only as last resort per [flauisearch][flauisearch] |
| Finding solely by visible Name (`ByName`) | Localised apps fail across languages | `AutomationId` is locale-independent per [msuia2][msuia2] |
| Sharing one `Application` across all test classes | UI state leaks between tests; one slow test halts the rest | Use one fixture per class (xUnit `IClassFixture`) |
| Forgetting `app.Dispose()` / `automation.Dispose()` | Orphaned processes accumulate on CI runner | `using` declaration or `IDisposable` fixture |
| Mouse-coordinate clicks (`Mouse.Click(x, y)`) | DPI / multi-monitor / theme changes break | Resolve element via UIA, call `Invoke()` |
| Asserting on raw bitmap screenshots | Brittle to font / theme / DPI | UIA tree is the assertion surface; screenshots only for canvas-rendered surfaces |
| Mixing UIA2 and UIA3 in one process | Unsupported per [FlaUInspect][flauinspect] inspector constraint | Pick one binding per test project |

## Limitations

- **Windows-only.** UIA is a Windows-specific API per [msuia2][msuia2].
  No macOS / Linux equivalent - see
  [`xctest-mac-desktop`](../xctest-mac-desktop/SKILL.md) and
  [`at-spi-linux`](../at-spi-linux/SKILL.md).
- **Requires an interactive desktop session.** UIA cannot drive
  Session-0 / headless Windows containers. `windows-latest` GitHub
  runners are interactive by default; self-hosted containers need
  Auto-Login + an unlocked desktop.
- **UIA2 vs UIA3 picked once per process.** Mixed-mode authoring is
  unsupported ([flauinspect][flauinspect]). New code should prefer
  UIA3 ([flaui][flaui]); UIA2 is retained for legacy WinForms
  compatibility but no hard deprecation date is published - pin the
  decision per project.
- **GPU / DirectComposition surfaces.** Some WPF + WinUI 3 controls
  rendered via DirectX may not expose a UIA tree. Inspect with
  [FlaUInspect][flauinspect]; fall back to image matching for those
  surfaces.
- **App must publish UIA.** Custom-painted Win32 windows that don't
  implement `IRawElementProviderSimple` are opaque to FlaUI (and to
  every other UIA-backed driver). Add UIA support in the application
  or fall back to image matching for those screens.

## Evals

Eval authoring for this skill is **deferred** per the v3.0 framework
§10 backfill priority order: per-tool wrappers rank lowest for eval
investment because "the tool itself is the oracle; 'the test runs as
documented' is the pass condition." This skill ships with `d7: 1`
(no evals authored yet) - that satisfies the v3.0 hard floor on D7
without expending eval budget that better targets critics and the
qa-llm-evaluation / qa-ai-assisted plugins first.

## References

- FlaUI repository (README) - [flaui][flaui].
- FlaUI wiki - [Application][flauiapp], [Searching][flauisearch],
  [Retry][flauiretry].
- FlaUInspect inspector tool - [flauinspect][flauinspect].
- Microsoft Learn - UI Automation Overview - [msuia2][msuia2].
- Sibling skills:
  [`winappdriver`](../winappdriver/SKILL.md),
  [`appium-windows-driver`](../appium-windows-driver/SKILL.md),
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- Composing harnesses:
  [`xunit-tests`](../../../qa-unit-tests-net/skills/xunit-tests/SKILL.md),
  [`nunit-tests`](../../../qa-unit-tests-net/skills/nunit-tests/SKILL.md),
  [`mstest-tests`](../../../qa-unit-tests-net/skills/mstest-tests/SKILL.md).
