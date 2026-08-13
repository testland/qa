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
[docs.unity3d.com/Packages/com.unity.test-framework@latest](https://docs.unity3d.com/Packages/com.unity.test-framework@latest).
It is **distinct from the ThrowTheSwitch Unity C testing library at
[throwtheswitch.org/unity](https://www.throwtheswitch.org/unity)** (a
single-C-file unit-test framework for bare-metal MCUs). The two tools share
only a name; they have unrelated origins, APIs, and consumers. **For the C
unit-test library, see the sibling skill `unity-test-framework-c`** in the
qa-embedded plugin.

UTF is built on **NUnit 3.5** and supports both **Edit Mode** and **Play Mode**
across Standalone, Android, and iOS target platforms (per the
[package overview](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html)).

**Versioning.** UTF is currently **v1.8**; the stable doc links below pin to
the **v1.4** manual snapshot for durable URLs. Both describe the same package.

Composes with:

- `platform-cert-overview-reference`
  for what category of test each Unity test belongs to (functional
  / performance / etc.), and
  for cert-gated requirements UTF tests should cover (XR-001
  Title Stability, XR-074 Service Loss, XR-115 Controller add /
  remove).
- `multiplayer-state-machine-coverage`
  and
  `gameplay-recording-replay`
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

UTF "is shipped with the Unity Editor and should be automatically included in
any project created with Unity 2019.2 or later" (per the package overview). For
manual install, open Package Manager → `+` → "Add package by name…" →
`com.unity.test-framework`.

The Test Runner window is at **Window → General → Test Runner** (may be
Window → Test Runner depending on Editor version).

### EditMode tests

Per the
[Edit Mode vs Play Mode tests page](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/edit-mode-vs-play-mode-tests.html),
Edit Mode tests "are only run in the Unity Editor and have access to the Editor
code in addition to the game code".

Layout (two options):

- **Editor folder (legacy):** place tests under any folder named `Editor/`.
  Unity auto-scopes them to the Editor platform.
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

The docs recommend the NUnit `Test` attribute rather than `UnityTest` unless
you need to yield special instructions in Edit Mode, or skip a frame / wait for
an amount of time in Play Mode.

### PlayMode tests

PlayMode tests "execute as coroutines within the game runtime and can run
standalone in a Player or within the Editor". Assembly definition:

```json
{
  "name": "MyGame.Tests.PlayMode",
  "references": ["MyGame.Runtime"],
  "optionalUnityReferences": ["TestAssemblies"],
  "includePlatforms": []
}
```

Per the edit-mode-vs-play-mode docs, the `.asmdef` must reference the code
under test (`"references": ["NewAssembly"]`), optionally include
`"optionalUnityReferences": ["TestAssemblies"]`, and leave
`"includePlatforms": []` empty to allow multiple target platforms.

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

The `[UnityTest]` attribute, returning `IEnumerator`, lets the test yield
frames (`yield return null`), seconds (`yield return new WaitForSeconds(2f)`),
or custom yield instructions - necessary for any frame-driven behaviour.

### Attributes

The common attributes are `[Test]` (synchronous NUnit), `[UnityTest]`
(coroutine, yields frames/seconds), `[SetUp]` / `[TearDown]`,
`[OneTimeSetUp]` / `[OneTimeTearDown]`, `[Category("Smoke")]` (CLI-selectable),
and `[UnityPlatform(...)]`. The full cheatsheet with sources and the
`ValueSource` parameterisation note is in
[references/attributes.md](references/attributes.md).

### NUnit assertion APIs

UTF is built on NUnit 3.5, so the full NUnit 3 assertion model applies -
`Assert.AreEqual`, `Assert.Throws<T>(() => ...)`,
`Assert.That(actual, Is.EqualTo(expected).Within(0.01f))`, etc. Prefer the
NUnit `Test` attribute over `UnityTest` unless you need to yield special
instructions.

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

Invoke Unity in batch mode and treat the `-testResults` XML as the source of
truth (Unity has no common exit-code definition):

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

The full batch-mode flag table (`-testFilter`, `-testPlatform`,
`-assemblyNames`, ordering / retry flags), the Windows invocation, and the
exit-code caveat are in [references/cli.md](references/cli.md).

## Parsing results

The `-testResults` XML is **NUnit 3 result format**. Surface `result="Failed"`
at the `<test-run>` level for the overall verdict, then enumerate
`<test-case result="Failed">` for per-test detail; `nunit-junit-xml`
converters exist for JUnit consumers. The full schema example is in
[references/results-and-ci.md](references/results-and-ci.md).

## CI integration

Run UTF in CI via `game-ci/unity-test-runner` (or the bare batch-mode CLI),
upload the `-testResults` XML as an artifact, and cache the `Library/` folder
across runs - Unity re-imports all assets without it, adding 5 - 15 min per
run. A complete GitHub Actions workflow is in
[references/results-and-ci.md](references/results-and-ci.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using `[UnityTest]` everywhere | Slower than `[Test]` because each test enters play mode | Use `[Test]` unless you need to yield (per the edit-mode-vs-play-mode docs) |
| Forgetting `optionalUnityReferences: ["TestAssemblies"]` | Test assembly isn't picked up by Test Runner | Add it per the PlayMode asmdef block above |
| Test asmdef references production asmdef but production has no public types | Tests can't compile | Use `InternalsVisibleTo` on production asmdef or expose minimal public surface |
| Not cleaning up `GameObject`s between EditMode tests | Cross-test contamination | `[TearDown]` `Object.DestroyImmediate(go)` on every fixture |
| Trusting Unity process exit code in CI | No common definition for exit codes | Parse `-testResults` XML in CI |
| Skipping the `Library/` cache | 5 - 15 min asset reimport per CI run | `actions/cache@v4` with the `Library/` path |
| Confusing this skill with ThrowTheSwitch Unity (C) | Different tool with the same name | See `unity-test-framework-c` |

## Limitations

Known constraints (per the v1.4 manual index):

- **No WSA platform support for `UnityTest`** - Windows Store Apps cannot run
  `[UnityTest]` coroutine-style tests.
- **Parameterised tests unsupported (except `ValueSource`)** - NUnit
  `[TestCase]`, `[TestCaseSource]` have historical caveats in UTF.
- **`[Repeat]` attribute incompatibility** - listed as a known limitation.
- **Nested test fixtures cannot run from the Editor UI.**
- **`[Retry]` attribute causes `InvalidCastException` in PlayMode tests.**

Other practical limitations:

- **Asset Database in PlayMode is sandboxed.** PlayMode tests cannot freely
  create / mutate assets the way EditMode tests can.
- **Coverage** requires the separate `com.unity.testtools.codecoverage`
  package; not included by default.
- **License gating on CI** - Unity batch-mode CI requires either a
  Personal/Plus license seat (`-username -password -serial`) or a manual `.ulf`
  license file; consult Unity's documentation for the current activation flow
  before standing up CI.
- **No public common exit-code definition** (per the command-line reference);
  parse XML, don't rely on exit code.
- **EditMode test that enters PlayMode** is supported ("Edit Mode tests can
  control entering and exiting Play Mode from your test") but cross-mode tests
  are notoriously flaky; prefer keeping the two modes' tests separate.
