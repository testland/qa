---
name: unity-test-framework
description: "Author and run the Unity game-engine Test Framework (`com.unity.test-framework`, currently v1.8). Distinct from the ThrowTheSwitch Unity C testing library at throwtheswitch.org/unity - the two tools share only a name. Covers package install via Package Manager, the EditMode vs PlayMode split, the [Test] / [UnityTest] / [SetUp] / [TearDown] / [UnityPlatform] attributes, assembly-definition setup (Editor folder vs asmdef with `includePlatforms` / `optionalUnityReferences: [TestAssemblies]`), Test Runner window, command-line batch invocation with `-runTests` / `-testPlatform` / `-testResults` / `-testFilter` / `-testCategory`, NUnit 3.5 assertion API, and CI integration. Use when the unit under test is C# Unity code that needs to exercise the Unity runtime or editor."
metadata:
  keywords: "unity, unity3d, test-framework, utf, edit-mode, play-mode, nunit, csharp, game-engine"
---

# unity-test-framework

## Overview

**Disambiguation up front.** This skill covers the
**Unity game-engine Test Framework** - the official Unity package
`com.unity.test-framework` documented at
[docs.unity3d.com/Packages/com.unity.test-framework@latest](https://docs.unity3d.com/Packages/com.unity.test-framework@latest)
(currently version 1.8 per the canonical-version redirect on
that page; manual mirrored at the
[v1.4 manual snapshot](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html)
for stable URLs).

It is **distinct from the ThrowTheSwitch Unity C testing library
at [throwtheswitch.org/unity](https://www.throwtheswitch.org/unity)**
(a single-C-file unit-test framework for bare-metal MCUs). The
two tools share only a name; they have unrelated origins, APIs,
and consumers. **For the C unit-test library, see the sibling
skill `unity-test-framework-c`** in the qa-embedded plugin.

Per the
[package overview](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html),
UTF is built on **NUnit 3.5** and supports both **Edit Mode** and
**Play Mode** across Standalone, Android, and iOS target platforms.

Composes with:

- [`game-test-categories-reference`](../game-test-categories-reference/SKILL.md)
  for what category of test each Unity test belongs to (functional
  /  performance / etc.).
- [`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
  for cert-gated requirements UTF tests should cover (XR-001
  Title Stability, XR-074 Service Loss, XR-115 Controller add /
  remove).
- [`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md)
  and
  [`gameplay-recording-replay`](../gameplay-recording-replay/SKILL.md)
  for state-machine and replay-driven test patterns inside UTF
  PlayMode tests.

## When to use

- Unit under test is **C# Unity code** that needs the Unity
  runtime (`MonoBehaviour`, `GameObject`, coroutines, scenes) or
  editor (`AssetDatabase`, `EditorWindow`) APIs available.
- You want CI-runnable tests that integrate with Unity Cloud
  Build, GitHub Actions, or other CI via Unity's batch-mode CLI.
- You need both isolated logic tests (EditMode) and integration
  tests that exercise scene lifecycle (PlayMode) in one harness.

For C unit tests on the firmware side of a hybrid game build,
use `unity-test-framework-c` instead.

## Authoring

### Install via Package Manager

Per the
[package overview](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html),
UTF "is shipped with the Unity Editor and should be automatically
included in any project created with Unity 2019.2 or later". For
manual install, open Package Manager → `+` → "Add package by
name…" → `com.unity.test-framework`.

The Test Runner window is at **Window → General → Test Runner**
(may be Window → Test Runner depending on Editor version).

### EditMode tests

Per the
[Edit Mode vs Play Mode tests page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html):
"Edit Mode tests … run in the Unity Editor without playing the
game" and "can access both editor and game code".

Layout (two options):

- **Editor folder (legacy):** place tests under any folder named
  `Editor/`. Unity auto-scopes them to the Editor platform.
- **Assembly definition (recommended):** create an `.asmdef` with
  `"includePlatforms": ["Editor"]`.

Minimal example:

```csharp
using NUnit.Framework;
using UnityEngine;

namespace MyGame.Tests.EditMode
{
    public class HealthComponentTests
    {
        [Test]
        public void Damage_DeductsCorrectAmount()
        {
            var go = new GameObject();
            var health = go.AddComponent<HealthComponent>();
            health.Initialize(maxHealth: 100);

            health.ApplyDamage(35);

            Assert.AreEqual(65, health.Current);
        }

        [TearDown]
        public void Cleanup()
        {
            // EditMode tests must clean up created GameObjects;
            // they don't auto-tear-down between cases.
        }
    }
}
```

Per the
[edit-mode-vs-play-mode-tests page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html),
the docs "recommend using the NUnit `Test` attribute rather than
`UnityTest`, unless you need to yield special instructions, in
Edit Mode, or if you need to skip a frame or wait for a certain
amount of time in Play Mode".

### PlayMode tests

Per the same page, PlayMode tests "execute as coroutines within
the game runtime and can run standalone in a Player or within the
Editor".

Assembly definition for PlayMode tests:

```json
{
  "name": "MyGame.Tests.PlayMode",
  "references": ["MyGame.Runtime"],
  "optionalUnityReferences": ["TestAssemblies"],
  "includePlatforms": []
}
```

Per the
[edit-mode-vs-play-mode-tests page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html):
the `.asmdef` must reference the code under test (`"references":
["NewAssembly"]`), optionally include `"optionalUnityReferences":
["TestAssemblies"]`, and leave `"includePlatforms": []` empty to
allow multiple target platforms.

Minimal example:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace MyGame.Tests.PlayMode
{
    public class EnemyAITests
    {
        [UnityTest]
        public IEnumerator Enemy_PursuesPlayer_WithinRange()
        {
            var player = new GameObject("Player");
            var enemy  = Object.Instantiate(Resources.Load<GameObject>("Enemy"));
            enemy.transform.position = new Vector3(10f, 0f, 0f);

            yield return new WaitForSeconds(2f);

            var distance = Vector3.Distance(player.transform.position,
                                            enemy.transform.position);
            Assert.Less(distance, 5f, "Enemy did not close on player");
        }
    }
}
```

The `[UnityTest]` attribute, returning `IEnumerator`, lets the
test yield frames (`yield return null`), seconds
(`yield return new WaitForSeconds(2f)`), or custom yield
instructions - necessary for any frame-driven behaviour.

### Attribute cheatsheet

Per the [v1.4 manual index](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html)
and NUnit 3.5 docs the framework wraps:

| Attribute | Purpose | Source |
|---|---|---|
| `[Test]` | Plain NUnit test - synchronous | NUnit; recommended default per edit-mode-vs-play-mode docs |
| `[UnityTest]` | Coroutine-style test that can yield frames / seconds in PlayMode or skip frames in EditMode | UTF-specific |
| `[SetUp]` / `[TearDown]` | Per-test fixture setup / cleanup | NUnit |
| `[OneTimeSetUp]` / `[OneTimeTearDown]` | Once-per-fixture setup / cleanup | NUnit |
| `[TestFixture]` | Marks a class as containing tests (optional in NUnit 3) | NUnit |
| `[Category("Smoke")]` | Tag a test for filtering | NUnit; selectable via CLI `-testCategory` |
| `[UnityPlatform(RuntimePlatform.WindowsPlayer)]` | Restrict test to specific runtime platforms | UTF-specific |
| `[ValueSource(nameof(MyCases))]` | Parameterised inputs | NUnit; `ValueSource` is supported per the [v1.4 manual](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html) (other parameterised attributes have known limitations - see Limitations section) |

### NUnit assertion APIs

Per the [package overview](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html),
UTF is built on **NUnit 3.5**. The full NUnit 3 assertion model
applies - `Assert.AreEqual`, `Assert.Throws<T>(() => ...)`,
`Assert.That(actual, Is.EqualTo(expected).Within(0.01f))`, etc.
Per Unity's recommendation in the edit-mode-vs-play-mode docs,
prefer the NUnit `Test` attribute over `UnityTest` "unless you
need to yield special instructions".

## Running

### From the Test Runner window

**Window → General → Test Runner** (path may be Window → Test
Runner in older Editor versions). The window shows two tabs:

- **EditMode** - synchronous tests executed against the editor
  domain.
- **PlayMode** - tests that enter and exit play mode for each
  fixture.

Click **Run All**, **Run Selected**, or right-click a fixture →
**Run** to execute. Results display inline with stack traces on
failure.

### From the command line (batch mode)

Per the
[command-line reference](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html),
Unity exposes these flags:

| Flag | Effect |
|---|---|
| `-runTests` | "Executes tests within the project." |
| `-batchmode` | "Removes the need for manual user inputs when running tests from the command line." |
| `-projectPath <path>` | Project root. |
| `-testResults <path>` | "Designates where Unity stores the result file (XML format per NUnit standards). If unspecified, results are saved in the project root." |
| `-testPlatform EditMode\|PlayMode\|<BuildTarget>` | "Default: EditMode if not specified." `BuildTarget` (e.g. `StandaloneWindows64`, `Android`) runs tests on a built player for that platform. |
| `-testFilter "Pattern"` | "Accepts a semicolon-separated list or regex pattern to match test names. Supports negation with `!`." |
| `-testCategory "Smoke;Critical"` | "Accepts a semicolon-separated list or regex pattern for category matching. Also supports negation with `!`." |
| `-assemblyNames "MyGame.Tests.PlayMode"` | Limit to specific test assemblies. |
| `-runSynchronously` | Run on the main thread synchronously (EditMode only). |
| `-orderedTestListFile`, `-randomOrderSeed`, `-retry`, `-repeat`, `-playerHeartbeatTimeout`, `-testSettingsFile` | "Control test execution order, failure handling, timing, and settings configuration" per the same page. |

Full example invocation (Linux / macOS):

```bash
Unity \
  -batchmode \
  -projectPath "$PWD" \
  -runTests \
  -testPlatform PlayMode \
  -testResults artifacts/playmode-results.xml \
  -testCategory "Smoke" \
  -logFile artifacts/unity.log
```

Windows equivalent: invoke
`"C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe"`
with the same flags.

### Exit-code caveat

Per the
[command-line reference page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html):
"There is currently no common definition for exit codes reported
by individual Unity components under test. Error messages and
stack traces in results provide better diagnostic information."
Treat the produced `-testResults` XML as the source of truth in
CI rather than process exit code.

## Parsing results

The XML written to `-testResults <path>` is **NUnit 3 result
format**. The CI pipeline must parse it to surface failures.

Top-level structure (per NUnit 3):

```xml
<test-run id="2" testcasecount="42" result="Failed" total="42"
          passed="40" failed="1" inconclusive="0" skipped="1">
  <test-suite ...>
    <test-case fullname="MyGame.Tests.HealthTests.Damage_DeductsCorrectAmount"
               result="Passed" duration="0.012"/>
    <test-case fullname="MyGame.Tests.EnemyAITests.Enemy_PursuesPlayer_WithinRange"
               result="Failed" duration="2.34">
      <failure>
        <message><![CDATA[Enemy did not close on player]]></message>
        <stack-trace><![CDATA[at MyGame.Tests.EnemyAITests...]]></stack-trace>
      </failure>
    </test-case>
  </test-suite>
</test-run>
```

Surface `result="Failed"` at the `<test-run>` level for the
overall pass / fail, then enumerate `<test-case result="Failed">`
for per-test detail. The schema is NUnit-canonical - parsers exist
for JUnit consumers (e.g., `nunit-junit-xml` converters) for tools
that expect JUnit XML.

## CI integration

GitHub Actions example using `game-ci/unity-test-runner`:

```yaml
jobs:
  unity-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - uses: actions/cache@v4
        with:
          path: Library
          key: Library-${{ github.sha }}
          restore-keys: Library-
      - uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          testMode: all  # editmode + playmode
          artifactsPath: artifacts
          coverageOptions: "generateAdditionalMetrics;generateHtmlReport"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unity-test-results
          path: artifacts/**/*.xml
```

Bare-CLI equivalent - invoke Unity directly with the flags from
the
[command-line reference](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html)
and treat the `-testResults` XML as source of truth.

Cache the `Library/` folder across runs - Unity re-imports all
assets without it, adding 5 - 15 min per CI run.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using `[UnityTest]` everywhere | Slower than `[Test]` because each test enters play mode | Per [edit-mode-vs-play-mode docs](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html), use `[Test]` unless you need to yield |
| Forgetting `optionalUnityReferences: ["TestAssemblies"]` | Test assembly isn't picked up by Test Runner | Add per the asmdef block in [edit-mode-vs-play-mode-tests](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html) |
| Test asmdef references production asmdef but production has no public types | Tests can't compile | Use `InternalsVisibleTo` attribute on production asmdef or expose minimal public surface |
| Not cleaning up `GameObject`s between EditMode tests | Cross-test contamination | `[TearDown]` `Object.DestroyImmediate(go)` on every fixture |
| Trusting Unity process exit code in CI | Per [command-line reference](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html), "no common definition for exit codes" | Parse `-testResults` XML in CI |
| Skipping the `Library/` cache | 5 - 15 min asset reimport per CI run | `actions/cache@v4` with the `Library/` path |
| Confusing this skill with ThrowTheSwitch Unity (C) | Different tool with the same name | See `unity-test-framework-c` |

## Limitations

Per the
[v1.4 manual index page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html),
known constraints:

- **No WSA platform support for `UnityTest`** - Windows Store
  Apps cannot run `[UnityTest]` coroutine-style tests.
- **Parameterised tests unsupported (except `ValueSource`)** - 
  NUnit `[TestCase]`, `[TestCaseSource]` have historical caveats
  in UTF.
- **`[Repeat]` attribute incompatibility** - listed as a known
  limitation.
- **Nested test fixtures cannot run from the Editor UI.**
- **`[Retry]` attribute causes `InvalidCastException` in PlayMode
  tests.**

Other practical limitations:

- **Asset Database in PlayMode is sandboxed.** PlayMode tests
  cannot freely create / mutate assets the way EditMode tests can.
- **Coverage** requires the separate `com.unity.testtools.codecoverage`
  package; not included by default.
- **License gating on CI** - Unity batch-mode CI requires either a
  Personal/Plus license seat (`-username -password -serial`) or a
  manual `.ulf` license file; consult Unity's documentation for
  the current activation flow before standing up CI.
- **No public common exit-code definition** per the
  [command-line reference](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html);
  parse XML, don't rely on exit code.
- **EditMode test that enters PlayMode** can do so per the
  [edit-mode-vs-play-mode-tests page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html)
  ("Edit Mode tests can control entering and exiting Play Mode
  from your test") but cross-mode tests are notoriously flaky;
  prefer keeping the two modes' tests separate.
