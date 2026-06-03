---
name: unreal-automation-system
description: "Author and run Unreal Engine's Automation Test Framework - Epic's C++ test framework for UE 4.x / 5.x, documented at dev.epicgames.com/documentation/en-us/unreal-engine. Covers the five test categories Epic defines (Unit / Feature / Smoke / Content Stress / Screenshot Comparison), the IMPLEMENT_SIMPLE_AUTOMATION_TEST and IMPLEMENT_COMPLEX_AUTOMATION_TEST macros, the BDD-style Automation Spec API (DEFINE_SPEC / BEGIN_DEFINE_SPEC / Describe / It / BeforeEach / LatentIt / xIt), latent commands (ADD_LATENT_AUTOMATION_COMMAND), the Automation Driver for UI input simulation (IAutomationDriverModule::Get().CreateDriver(), By::Id / By::Path locators), running via Session Frontend (Window > Test Automation) and command line (-ExecCmds=\"Automation RunTests …\"), and CI integration. Use when the unit under test is C++ Unreal code that needs the UE runtime, editor, or UMG UI surface."
rating: 24
d6: 4
keywords: ["unreal", "ue4", "ue5", "automation", "automation-spec", "automation-driver", "session-frontend", "gauntlet", "cpp", "game-engine"]
---

# unreal-automation-system

## Overview

This skill wraps the **C++ Automation Test Framework** (UE 4.x /
5.x) plus the two most commonly composed sub-systems. Per Epic's
[Automation Test Framework documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine),
the framework spans five test categories (Unit, Feature, Smoke,
Content Stress, Screenshot Comparison) and supports multiple
authoring styles (traditional, BDD Spec, UI Driver, Functional,
Python / Blueprint).

- **Automation Spec** - BDD-style `Describe` / `It` /
  `BeforeEach` per
  [Automation Spec documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine).
- **Automation Driver** - UI input simulation per
  [Automation Driver documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine).

Composes with:

- [`game-test-categories-reference`](../game-test-categories-reference/SKILL.md)
  for the canonical six categories Unreal's five categories map to.
- [`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
  for cert-gated requirements automation tests should cover.
- [`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md)
  for replication / dedicated-server state coverage authored as
  automation tests.

## When to use

- Unit under test is **C++ code in an Unreal Engine project**
  (UE 4.x or UE 5.x) that needs the engine runtime, editor APIs,
  or UMG UI surface.
- You want CI-runnable tests via Unreal's command-line
  Automation entry point.
- You need BDD-style readable specs (Automation Spec) or scripted
  UI input simulation (Automation Driver) on top of plain
  assertion tests.

For Python / Blueprint editor tests outside C++, see
[Editor Automation in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine).
For end-to-end pipeline / build-farm orchestration, use
[Gauntlet](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)
on top of the framework this skill covers.

## Authoring

### Test categories and flags

Per the
[Automation Test Framework page](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine),
Epic's five categories are:

| Category | Purpose |
|---|---|
| **Unit** | "API level verification tests." |
| **Feature** | "System-level tests that verify such things as PIE, in-game stats, and changing resolution." |
| **Smoke** | Tests that "complete within 1 second" and run automatically. |
| **Content Stress** | "More thorough testing of a particular system to avoid crashes." |
| **Screenshot Comparison** | For comparing renders "between versions or builds". |

Each test declares flags from `EAutomationTestFlags` that mix:

- **Filter** - `SmokeFilter`, `EngineFilter`, `ProductFilter`,
  `PerfFilter`, `StressFilter`, `NegativeFilter`.
- **Application context** - `EditorContext`, `ClientContext`,
  `ServerContext`, `CommandletContext`, plus the convenience mask
  `ApplicationContextMask`.

Typical combo for a product-level test runnable in editor / client
/ server contexts:
`EAutomationTestFlags::ProductFilter | EAutomationTestFlags::ApplicationContextMask`.

### Simple automation test

Per
[Automation Test Framework documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine),
the canonical macro pair is `IMPLEMENT_SIMPLE_AUTOMATION_TEST` +
`RunTest`:

```cpp
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHealthComponentDamageTest,
    "MyGame.Health.Damage_DeductsCorrectAmount",
    EAutomationTestFlags::ProductFilter |
        EAutomationTestFlags::ApplicationContextMask)

bool FHealthComponentDamageTest::RunTest(const FString& Parameters)
{
    UHealthComponent* Health = NewObject<UHealthComponent>();
    Health->Initialize(/* MaxHealth */ 100.f);

    Health->ApplyDamage(35.f);

    TestEqual(TEXT("Current HP after 35 damage"),
              Health->GetCurrent(),
              65.f);
    return true;
}
```

Naming convention: the second macro argument
(`"MyGame.Health.Damage_…"`) is the **test path** shown in the
Session Frontend. Dot-separated segments build a tree.

### Complex automation test (data-driven)

`IMPLEMENT_COMPLEX_AUTOMATION_TEST` generates a sub-test per row
returned from `GetTests`:

```cpp
IMPLEMENT_COMPLEX_AUTOMATION_TEST(
    FAllAssetsLoadCleanlyTest,
    "MyGame.Assets.LoadCleanly",
    EAutomationTestFlags::ProductFilter |
        EAutomationTestFlags::ApplicationContextMask)

void FAllAssetsLoadCleanlyTest::GetTests(
    TArray<FString>& OutBeautifiedNames,
    TArray<FString>& OutTestCommands) const
{
    // Enumerate every .uasset under /Game/Characters
    // and emit one sub-test per asset path.
}

bool FAllAssetsLoadCleanlyTest::RunTest(const FString& Parameters)
{
    // Parameters is the row from GetTests.
    UObject* Loaded = StaticLoadObject(UObject::StaticClass(),
                                       nullptr, *Parameters);
    return TestNotNull(TEXT("Asset loaded"), Loaded);
}
```

### Latent commands

For tests that must span multiple frames, use
`ADD_LATENT_AUTOMATION_COMMAND` to chain commands that yield back
to the engine tick loop:

```cpp
ADD_LATENT_AUTOMATION_COMMAND(
    FEngineWaitLatentCommand(/* Seconds */ 2.0f));
```

Custom latent commands derive from `IAutomationLatentCommand` and
override `Update()` (returns `true` when complete).

### Automation Spec (BDD style)

Per the
[Automation Spec documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine),
specs are "built following the Behavior Driven Design (BDD)
methodology" and use `Describe` / `It` / `BeforeEach` /
`AfterEach` instead of one `RunTest` body. Spec files use
`.spec.cpp` extension.

Simple spec:

```cpp
DEFINE_SPEC(
    FInventorySpec,
    "MyGame.Inventory",
    EAutomationTestFlags::ProductFilter |
        EAutomationTestFlags::ApplicationContextMask)

void FInventorySpec::Define()
{
    Describe("AddItem", [this]()
    {
        It("should increase count by the stack amount", [this]()
        {
            FInventory Inv;
            Inv.AddItem(EItem::Potion, /* Count */ 3);
            TestEqual(TEXT("Potion count"),
                      Inv.GetCount(EItem::Potion),
                      3);
        });

        It("should reject items past max stack", [this]()
        {
            FInventory Inv;
            const bool bOk = Inv.AddItem(EItem::Potion, 999);
            TestFalse(TEXT("Over-cap add rejected"), bOk);
        });
    });
}
```

Per the same docs, `It()` descriptions should "start with
'should'" so the runner output reads as full sentences ("Inventory
AddItem should increase count by the stack amount").

For specs with shared state, use `BEGIN_DEFINE_SPEC` /
`END_DEFINE_SPEC`:

```cpp
BEGIN_DEFINE_SPEC(
    FBackendSpec,
    "MyGame.Backend",
    EAutomationTestFlags::ProductFilter |
        EAutomationTestFlags::ApplicationContextMask)
    TSharedPtr<FMyBackendClient> Client;
END_DEFINE_SPEC(FBackendSpec)

void FBackendSpec::Define()
{
    BeforeEach([this]()
    {
        Client = MakeShared<FMyBackendClient>();
    });

    LatentIt("should return items asynchronously",
        [this](const FDoneDelegate& Done)
    {
        Client->QueryItemsAsync([Done](const TArray<FItem>& Items)
        {
            // assert on Items here, then signal completion
            Done.Execute();
        });
    });
}
```

`LatentIt` (per the
[Automation Spec docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine))
gives the test a `FDoneDelegate` it must invoke when the async
work has finished - Unreal's analogue of a Promise / future-based
test.

Disabling: prefix the spec function with `x` (`xIt(…)`,
`xDescribe(…)`) per the same docs.

### Automation Driver (UI input simulation)

Per the
[Automation Driver documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine),
Automation Driver "enabling programmers to simulate user
input … cursor movement, clicks, pressing, typing, scrolling,
drag-and-drop, and more". It pairs with Automation Spec; the
synchronous Driver API **cannot run on the GameThread** so the
test must execute on a ThreadPool context.

Pattern (paraphrased from the same page):

```cpp
BEGIN_DEFINE_SPEC(FMenuDriverSpec,
    "MyGame.Menu.Driver",
    EAutomationTestFlags::ProductFilter |
        EAutomationTestFlags::ApplicationContextMask)
    FAutomationDriverPtr Driver;
END_DEFINE_SPEC(FMenuDriverSpec)

void FMenuDriverSpec::Define()
{
    BeforeEach(EAsyncExecution::TaskGraphMainThread, [this]()
    {
        IAutomationDriverModule::Get().Enable();
        Driver = IAutomationDriverModule::Get().CreateDriver();
    });

    It("Submit button should close the menu",
       EAsyncExecution::ThreadPool, [this]()
    {
        FDriverElementRef Submit = Driver->FindElement(
            By::Id("SubmitButton"));
        Submit->Click();
        // assert menu state changed …
    });

    AfterEach(EAsyncExecution::TaskGraphMainThread, [this]()
    {
        IAutomationDriverModule::Get().Disable();
    });
}
```

**Locator hierarchy** (per the
[Automation Driver page](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine)):

| Locator | When | Caveat |
|---|---|---|
| `By::Id("SubmitButton")` | Most reliable | Requires explicit metadata tagging on the widget |
| `By::Path("…")` | Powerful | "Brittle" per the docs - depends on widget hierarchy |
| `By::Cursor()` | Returns widget under cursor | Mainly for hover tests |
| `By::Delegate(…)` | Custom lambda discovery | Power-user fallback |

`FindElement` returns a `FDriverElementRef`; actions like
`Click()`, `Type()`, `TypeChord()` are exposed on the element.
"All Automation Driver actions automatically wait the configured
ImplicitWait timespan for any dependent scenarios" per the same
page.

## Running

### Session Frontend (Editor)

Per the
[Automation Test Framework documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine),
open **Window → Test Automation** (or equivalent **Session
Frontend**) inside the Editor. Tests appear as a tree keyed on
the test path (the dot-separated string from the test macro).
Click **Run Tests** for selected leaves; results show pass / fail
+ log output inline.

### Command line

Run tests from the command line by launching the editor /
commandlet with `-ExecCmds`:

```bash
UnrealEditor-Cmd.exe MyGame.uproject \
    -ExecCmds="Automation RunTests MyGame.Inventory; Quit" \
    -unattended -nopause -testexit="Automation Test Queue Empty" \
    -ReportOutputPath="artifacts/automation" \
    -log
```

Variants:

- `Automation RunTests <Filter>` - run tests matching the path
  prefix.
- `Automation RunAll` - run every registered test.
- `Automation Quit` - quit when queue drains.

On Windows the editor binary is `UnrealEditor-Cmd.exe`; on
macOS / Linux the launcher script is `UnrealEditor` with the
same flags.

### Gauntlet for build-farm runs

For full build-and-test pipelines (deploy a packaged build to a
target devkit, run automation, collect artifacts), the next
layer up is **Gauntlet** (Unreal's automation harness referenced
on the
[Automation Test Framework page](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)).
Out of scope for this skill - gauntlet wraps the same `Automation
RunTests` command-line surface internally.

## Parsing results

The `-ReportOutputPath` directory contains a JSON `index.json`
plus per-test JSON / HTML detail. Top-level shape:

```json
{
  "devices": [{
    "deviceName": "WindowsEditor",
    "instance": "WindowsEditor"
  }],
  "reportCreatedOn": "2026-05-21T10:33:00Z",
  "succeeded": 38,
  "failed": 1,
  "succeededWithWarnings": 2,
  "notRun": 0,
  "totalDuration": 142.7,
  "tests": [
    {
      "fullTestPath": "MyGame.Inventory.AddItem should increase count by the stack amount",
      "testDisplayName": "should increase count by the stack amount",
      "state": "Success",
      "entries": [/* per-step log entries */]
    },
    {
      "fullTestPath": "MyGame.Inventory.AddItem should reject items past max stack",
      "state": "Fail",
      "entries": [/* assertion failure detail */]
    }
  ]
}
```

(Field names paraphrased from observed Unreal output; the precise
schema ships with the engine version under
`Engine/Source/Runtime/AutomationController/`. For CI gating,
treat any `"state": "Fail"` as a failed build.)

There is no public common exit code; parse the JSON or scrape the
log for `LogAutomationController: Display: Test ...: Result: Fail`
lines.

## CI integration

GitHub Actions example (paraphrased from common Unreal CI
patterns; Unreal CI itself is documented inside the editor SDK):

```yaml
jobs:
  unreal-automation:
    runs-on: windows-2022
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - name: Run automation tests
        shell: pwsh
        run: |
          $UE = "C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
          & $UE "$PWD\MyGame.uproject" `
            -ExecCmds="Automation RunTests MyGame; Quit" `
            -unattended -nopause `
            -testexit="Automation Test Queue Empty" `
            -ReportOutputPath="$PWD\artifacts\automation" `
            -log
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: automation-report
          path: artifacts/automation
```

CI pipelines typically split the test run into:

- **PR job** - `EAutomationTestFlags::SmokeFilter` only
  ("complete within 1 second" per the
  [framework docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)),
  for sub-minute PR feedback.
- **Nightly job** - `ProductFilter | StressFilter` plus screenshot
  comparison.

For a sketch of how internal QA categories
(`game-test-categories-reference`) map to Unreal's flags, see the
[category reference](../game-test-categories-reference/SKILL.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| All tests as `SmokeFilter` | Smoke tests "complete within 1 second" per [framework docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine) - long tests break the smoke contract | Use `ProductFilter` for tests > 1 s |
| Running Automation Driver on GameThread | API "cannot run on the GameThread" per [Driver docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine) | Use `EAsyncExecution::ThreadPool` on the driver-using `It` |
| Spec without `It` descriptions starting with "should" | Runner output reads poorly | Per [Spec docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine), start descriptions with "should" |
| Trusting `By::Path` locators | "Brittle" per [Driver docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine) | Prefer `By::Id` with tagged metadata |
| `Sleep`-style waits in latent commands | Flaky under CI load | Use `FDoneDelegate` (LatentIt) or custom `IAutomationLatentCommand::Update()` polling |
| Spec test file without `.spec.cpp` extension | Build system may not pick it up | Per [Spec docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine), use `.spec.cpp` suffix and no "Test" in filename |
| Cloning non-thread-safe shared pointers in async `It` | Crash under threadpool | Per [Driver docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine), cache them on the test class |
| No `BeforeEach` / `AfterEach` cleanup of `IAutomationDriverModule` | Driver state leaks between specs | Pair `Enable()` / `Disable()` calls in `BeforeEach` / `AfterEach` per [Driver docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-driver-in-unreal-engine) |

## Limitations

- **C++ build required.** Tests live in C++ modules; pure-content
  Blueprint projects need a code module added to use this
  framework. (Pure Blueprint projects can use Blueprint Functional
  Tests in-level - see Epic's docs on Functional Testing.)
- **No common exit code definition** comparable to Unity's caveat - 
  parse the `-ReportOutputPath` JSON or scrape the log for
  `LogAutomationController` Fail lines.
- **Spec parameterised tests** are loop-generated per
  [Spec docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine);
  there is no `[TestCase]` analogue from NUnit. The framework is
  NUnit-inspired but **not** NUnit-derived (unlike Unity's UTF).
- **Screenshot comparison** baseline storage + tolerance
  configuration is engine-version-specific - consult per-version
  Epic docs.
- **Editor-context tests cannot run in dedicated-server only
  builds** - declare `EditorContext` on those tests; client / server
  tests need their own flag set.
- **Documentation source.** The
  [dev.epicgames.com docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)
  are the public mirror; deeper detail (full macro implementations,
  precise JSON report schema) lives in the engine source under
  `Engine/Source/Runtime/AutomationController/` and
  `Engine/Source/Developer/AutomationMessages/` - partners with
  engine source access should consult those for authoritative
  details.
