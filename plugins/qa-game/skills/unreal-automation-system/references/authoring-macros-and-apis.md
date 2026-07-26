# Authoring macros and APIs

Deep reference for `unreal-automation-system` SKILL.md - the full macro,
Automation Spec, and Automation Driver code. Consult after picking the test
category and flags in the spine, when writing the actual test body.

## Simple automation test

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

## Complex automation test (data-driven)

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

## Latent commands

For tests that must span multiple frames, use
`ADD_LATENT_AUTOMATION_COMMAND` to chain commands that yield back
to the engine tick loop:

```cpp
ADD_LATENT_AUTOMATION_COMMAND(
    FEngineWaitLatentCommand(/* Seconds */ 2.0f));
```

Custom latent commands derive from `IAutomationLatentCommand` and
override `Update()` (returns `true` when complete).

## Automation Spec (BDD style)

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

## Automation Driver (UI input simulation)

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
