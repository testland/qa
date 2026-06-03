---
component: game-test-scenario-author
type: agent
---

# game-test-scenario-author - evals

Companion eval cases for [`game-test-scenario-author`](../../game-test-scenario-author.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding the
**Input** block as the first user message to the agent and comparing the emitted
scenario file (or the agent's refuse-to-proceed message) against the
**Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date - each
eval is designed to be re-run against each tier.

## Eval 1 - happy path - Unity PlayMode → Assets/Tests/PlayMode/PlayerControllerTests.cs + [UnityTest] IEnumerator

**Input:**

```
Author one game-engine test scenario for this target gameplay system.

Target system: PlayerController (Assets/Scripts/PlayerController.cs)
  public class PlayerController : MonoBehaviour {
      public float speed = 1f;
      public void Move(Vector3 direction) { transform.position += direction * speed * Time.deltaTime; }
  }
Behavior spec: "Given PlayerController.speed == 1f and Time.deltaTime fixed,
                when Move(Vector3.forward) is called every frame for 60 frames,
                then transform.position.z advances by approximately 1.0 (one
                unit per second at 60 fps)."
Project root: .

Project markers detected:
  - ProjectSettings/ProjectVersion.txt → "m_EditorVersion: 6000.0.23f1"
  - (no .uproject, no project.godot)
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects Unity (only `ProjectSettings/ProjectVersion.txt` present).
Picks **PlayMode** (spec drives the game loop across frames, references
`Time.deltaTime`). Emits ONE test file at
`Assets/Tests/PlayMode/PlayerControllerTests.cs` with `using NUnit.Framework`,
`using UnityEngine.TestTools`, a method
`[UnityTest] public IEnumerator Move_AdvancesPositionForward_OneUnitPerSecond()`,
a body that creates a `PlayerController`, loops with `yield return null` to
skip frames, and ends with an NUnit `Assert.That(...)` / `Assert.AreEqual(...)`
on `transform.position.z`. Does NOT use `Thread.Sleep` or `WaitForSeconds`.
Does NOT modify `PlayerController.cs`.

**Pass condition:** Output filename ends in `PlayerControllerTests.cs` under
`Assets/Tests/PlayMode/`. Output contains `[UnityTest]` AND `IEnumerator` AND
`yield return null` AND `Assert.` AND `Move(`. Output does NOT contain
`Thread.Sleep`, `WaitForSeconds`, `IMPLEMENT_SIMPLE_AUTOMATION_TEST`, OR
`extends GutTest`.

## Eval 2 - branch - Godot GUT → test/test_health_component.gd + extends GutTest + assert_eq

**Input:**

```
Author one game-engine test scenario for this target gameplay system.

Target system: HealthComponent (src/health_component.gd)
  extends Node
  var hp: int = 100
  func take_damage(amount: int) -> void:
      hp -= amount
Behavior spec: "Given a HealthComponent with hp == 100, when take_damage(50)
                is called once, then hp == 50."
Project root: .

Project markers detected:
  - project.godot → "config_version=5; [application] config/name=\"MyGame\""
  - (no ProjectSettings/ProjectVersion.txt, no *.uproject)
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects Godot (only `project.godot` present). Switches from the
Unity / Unreal defaults to GUT. Emits ONE test file at
`test/test_health_component.gd` with `extends GutTest`, a function
`func test_take_damage_reduces_hp_by_amount():` (or similar `test_` prefix),
a body that constructs the HealthComponent (via `preload(...).new()` or
direct `var component = HealthComponent.new()`), calls `take_damage(50)`,
and asserts `assert_eq(component.hp, 50, "...")`. Does NOT introduce Unity
(`[UnityTest]`, `IEnumerator`) or Unreal (`IMPLEMENT_SIMPLE_AUTOMATION_TEST`,
`RunTest`).

**Pass condition:** Output filename ends in `test_health_component.gd` under
`test/`. Output contains `extends GutTest` AND `func test_` AND `assert_eq(`
AND `take_damage(`. Output does NOT contain `[UnityTest]`,
`IMPLEMENT_SIMPLE_AUTOMATION_TEST`, OR `using NUnit.Framework`.

## Eval 3 - adversarial - multi-engine project (Unity + Unreal markers both present) → refuse, ask which engine

**Input:**

```
Author one game-engine test scenario for this target gameplay system.

Target system: InventoryService (src/InventoryService.cs)
  public class InventoryService { public bool AddItem(string id) { ... } }
Behavior spec: "Given an empty inventory, when AddItem(\"sword\") is called,
                then the inventory contains \"sword\" and AddItem returns true."
Project root: .

Project markers detected:
  - ProjectSettings/ProjectVersion.txt → "m_EditorVersion: 6000.0.23f1"
  - MyGame.uproject → "{ \"FileVersion\": 3, \"EngineAssociation\": \"5.4\" }"
  - (no project.godot)
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects that BOTH the Unity marker
(`ProjectSettings/ProjectVersion.txt`) AND the Unreal marker (`MyGame.uproject`)
are present at the project root, which triggers the Refuse-to-proceed rule
("Conflicting engine markers at the project root → halt and ask which engine
owns the new scenario; never guess"). Asks the user which engine should own
the new test. Does NOT silently default to one engine. Does NOT emit a
Unity `[Test]` / `[UnityTest]` file. Does NOT emit an Unreal
`IMPLEMENT_SIMPLE_AUTOMATION_TEST` file.

**Pass condition:** Output does NOT contain a generated test method body
(no `[Test]`, no `[UnityTest]`, no `IMPLEMENT_SIMPLE_AUTOMATION_TEST`, no
`extends GutTest`, no `func test_`, no `IEnumerator`, no `RunTest(`). Output
contains at least one of "which engine" / "conflicting" / "ambiguous" /
"both Unity and Unreal" AND asks the user to disambiguate.

## Reproducibility notes

- Inputs are concrete project-marker contents inlined above; no external
  fixtures.
- Pass conditions are string-match checks on the emitted scenario file
  content (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface
  (`Write`, `Edit`, `Bash(unity *)` / `Bash(unreal *)` / `Bash(godot *)`)
  writes only into the project's detected test directory
  (`Assets/Tests/{EditMode,PlayMode}/` for Unity, `Source/<Module>/Tests/`
  for Unreal, `test/` for Godot); eval re-runs must not modify gameplay
  source files.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (≥3 cases, ≥1 adversarial, concrete pass conditions).
