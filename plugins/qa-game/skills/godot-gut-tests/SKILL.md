---
name: godot-gut-tests
description: "Author and run GUT (Godot Unit Test) - the community-canonical GDScript test framework at github.com/bitwes/Gut and gut.readthedocs.io. Covers install (Godot Asset Library or manual `addons/gut/` copy + plugin enable), GUT panel inside the editor, writing tests that extend GutTest with `test_` prefix methods, the assertion family (assert_eq / assert_almost_eq / assert_true / assert_signal_emitted), lifecycle hooks (before_each / after_each / before_all / after_all), inner classes for grouping, parameterized tests via `params=[...]`, doubles / stubs / spies, async / coroutine tests, the command-line runner (`-d -s addons/gut/gut_cmdln.gd -gdir=res://test -gjunit_xml_file=... -gexit`), JUnit XML export, and CI integration. Godot 4.x uses GUT 9.x (current main branch supports 4.6.x; godot_4_7 branch for 4.7.x); Godot 3.x uses GUT 7.x. Use when the unit under test is GDScript code in a Godot project."
metadata:
  keywords: "godot, gut, gdscript, unit-test, game-engine, junit-xml, bitwes"
---

# godot-gut-tests

## Overview

This skill wraps [GUT (Godot Unit
Test)](https://github.com/bitwes/Gut) - the community-canonical
GDScript test framework. Godot does not ship a first-party
equivalent of Unity's Test Framework or Unreal's Automation
System for GDScript user code.

Per the [GUT README](https://github.com/bitwes/Gut):

| Engine | GUT version | Branch |
|---|---|---|
| Godot 4.6.x | 9.x | main |
| Godot 4.7.x | 9.x | godot_4_7 branch |
| Godot 3.4.x | 7.x (currently 7.4.3) | maintained |

Composes with:

- [`game-test-categories-reference`](../game-test-categories-reference/SKILL.md)
  for the canonical six categories GUT tests map to.
- [`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
  for cert-gated requirements GUT tests should cover where the
  title ships to Xbox / PlayStation / Switch via Godot exports.
- [`gameplay-recording-replay`](../gameplay-recording-replay/SKILL.md)
  for replay-driven coverage authored on top of GUT.

## When to use

- Unit under test is **GDScript code in a Godot project**
  (Godot 3.x or 4.x).
- You want a `before_each` / `after_each` / parameterised / mock
  test surface inside the editor with a CLI runner for CI.
- You need JUnit XML export so a generic CI dashboard
  (GitHub Actions test reporter, Jenkins JUnit plugin, etc.) can
  surface failures.

For pure-C# tests inside Godot's C# scripting layer, use
.NET-canonical test runners (xUnit, NUnit) rather than GUT - GUT
is GDScript-first.

## Authoring

### Install

Two paths, per the [GUT README](https://github.com/bitwes/Gut):

**Asset Library (recommended for compatible engine versions):**

1. Inside the Godot editor → **AssetLib** tab.
2. Search for "GUT" → install.
3. **Project → Project Settings → Plugins → enable GUT**.
4. Re-launch the editor.

**Manual:**

1. Clone or download the GUT repo from
   [github.com/bitwes/Gut](https://github.com/bitwes/Gut).
2. Copy the `addons/gut/` directory into your project's `addons/`
   directory.
3. Enable the plugin as above.

After enabling, a **GUT** panel appears in the bottom dock.

### Project layout

Typical convention (the GUT runner defaults work with this):

```
my_godot_project/
  addons/gut/                # the framework
  src/
    health.gd
    enemy_ai.gd
  test/
    unit/
      test_health.gd
      test_enemy_ai.gd
    integration/
      test_save_load.gd
  .gutconfig.json            # optional config file
  project.godot
```

### Minimal test

Per [gut.readthedocs.io](https://gut.readthedocs.io/), tests
"extend the GutTest class and use assertion methods like
`assert_eq`, `assert_almost_eq`, `assert_true`, and
`assert_signal_emitted`". Test methods are prefixed `test_`.

```gdscript
extends GutTest

func test_damage_deducts_correct_amount():
    var health := preload("res://src/health.gd").new()
    health.initialize(100)

    health.apply_damage(35)

    assert_eq(health.current, 65, "65 HP after 35 dmg from 100")
```

### Lifecycle hooks

Per the same docs, lifecycle hooks are:

| Hook | Scope |
|---|---|
| `before_all` | Once before every test in the script |
| `before_each` | Before each `test_*` method |
| `after_each` | After each `test_*` method |
| `after_all` | Once after every test in the script |

```gdscript
extends GutTest

var _player

func before_each():
    _player = preload("res://src/player.gd").new()

func after_each():
    _player.queue_free()
    _player = null

func test_player_starts_with_full_health():
    assert_eq(_player.health, _player.max_health)
```

### Assertion family

Common assertions per
[gut.readthedocs.io](https://gut.readthedocs.io/) and the
[GUT README](https://github.com/bitwes/Gut):

| Assertion | Use |
|---|---|
| `assert_eq(a, b, msg)` | Equality |
| `assert_ne(a, b, msg)` | Inequality |
| `assert_almost_eq(a, b, tol, msg)` | Float comparison within tolerance |
| `assert_true(v, msg)` / `assert_false(v, msg)` | Boolean |
| `assert_null(v, msg)` / `assert_not_null(v, msg)` | Null check |
| `assert_has(coll, v, msg)` / `assert_does_not_have(coll, v, msg)` | Membership |
| `assert_signal_emitted(obj, "signal_name", msg)` | Signal emission |
| `assert_signal_emitted_with_parameters(obj, "name", args, msg)` | Signal emission with payload |
| `assert_gt(a, b, msg)` / `assert_lt(a, b, msg)` | Ordering |
| `assert_called(double, "method_name", args)` | Spy verification |

Per the README, GUT exposes "a plethora of asserts and utility
methods" - check the `addons/gut/test.gd` source in your installed
version for the complete signature list at the engine version you
ship against.

### Inner classes (grouping)

Per the [GUT README](https://github.com/bitwes/Gut), tests can be
organised via inner classes:

```gdscript
extends GutTest

class TestAddItem:
    extends GutTest

    var _inv

    func before_each():
        _inv = preload("res://src/inventory.gd").new()

    func test_increases_count_by_stack():
        _inv.add_item("potion", 3)
        assert_eq(_inv.count_of("potion"), 3)

    func test_rejects_over_max_stack():
        var ok = _inv.add_item("potion", 999)
        assert_false(ok)

class TestRemoveItem:
    extends GutTest
    # …
```

Each inner class reports as its own grouping in the GUT panel.

### Parameterised tests

Per [gut.readthedocs.io](https://gut.readthedocs.io/), GUT
supports "parameterized tests using `params=[...]`":

```gdscript
extends GutTest

var damage_cases = [
    [100, 25, 75],
    [100, 100, 0],
    [50,  60,  0],     # clamps to zero, not negative
    [100, 0,  100],
]

func test_apply_damage_table(params=use_parameters(damage_cases)):
    var health = preload("res://src/health.gd").new()
    health.initialize(params[0])
    health.apply_damage(params[1])
    assert_eq(health.current, params[2])
```

Each row in `damage_cases` becomes its own test case in the
report.

### Doubles, stubs, and spies

Per the [GUT README](https://github.com/bitwes/Gut), GUT supports
"full / partial doubles, stubbing, spies". Typical pattern:

```gdscript
extends GutTest

func test_save_calls_backend():
    var backend_double = double("res://src/backend.gd").new()
    stub(backend_double, "save").to_return(true)

    var manager = preload("res://src/save_manager.gd").new()
    manager.backend = backend_double

    manager.save_game({"hp": 50})

    assert_called(backend_double, "save", [{"hp": 50}])
```

`double(path)` produces a fake script; `stub(...).to_return(value)`
configures return values; `assert_called(...)` is the spy
assertion.

### Async / coroutine tests

Per [gut.readthedocs.io](https://gut.readthedocs.io/), GUT
supports "coroutines and async test support" - a `test_*` method
can `await` signals or timers and the runner waits before moving
on:

```gdscript
extends GutTest

func test_async_load_completes():
    var loader = preload("res://src/async_loader.gd").new()
    loader.start_load("res://big_scene.tscn")

    await get_tree().create_timer(0.5).timeout

    assert_true(loader.is_done)
    assert_not_null(loader.result)
```

## Running

### From the GUT editor panel

After enabling the plugin, the **GUT panel** appears in the
bottom dock (Editor → Bottom Panel → GUT). Per
[gut.readthedocs.io](https://gut.readthedocs.io/), the panel
supports "normal and compact views". Click **Run All** or
right-click a script → **Run** to execute.

### From the command line

Per [gut.readthedocs.io](https://gut.readthedocs.io/), the
command-line runner is invoked via
`-d -s addons/gut/gut_cmdln.gd` plus GUT-specific options:

```bash
godot \
  --headless \
  -d \
  -s addons/gut/gut_cmdln.gd \
  -gdir=res://test \
  -gjunit_xml_file=artifacts/gut-junit.xml \
  -gexit
```

Common GUT CLI flags (per the same docs):

| Flag | Effect |
|---|---|
| `-gdir=res://test` | Recurse this directory for tests |
| `-gtest=res://test/unit/test_health.gd` | Run a single test script |
| `-ginner_class=TestAddItem` | Limit to one inner class |
| `-gunit_test_name=test_increases_count_by_stack` | Limit to one test method |
| `-gconfig=res://.gutconfig.json` | Load config from JSON |
| `-gjunit_xml_file=artifacts/gut-junit.xml` | Write JUnit XML report |
| `-gjunit_xml_timestamp` | Add timestamp suffix to filename |
| `-glog=3` | Log verbosity (0 - 3) |
| `-gexit` | Exit Godot after run (essential in CI) |

`--headless` runs Godot without a display window - required for
most CI environments. `-d` runs in debug mode so the test runner
script (`addons/gut/gut_cmdln.gd`) executes.

### Config file

A `.gutconfig.json` at the project root lets the GUT panel and
CLI runner share settings:

```json
{
  "dirs": ["res://test/unit", "res://test/integration"],
  "include_subdirs": true,
  "log_level": 1,
  "junit_xml_file": "artifacts/gut-junit.xml",
  "double_strategy": "partial"
}
```

(Field names per
[gut.readthedocs.io](https://gut.readthedocs.io/) - check your
installed `addons/gut/` version for the authoritative schema.)

## Parsing results

GUT exports **JUnit XML** when `-gjunit_xml_file=…` is set. Per
[gut.readthedocs.io](https://gut.readthedocs.io/), this is the
recommended CI-consumable output. Top-level shape:

```xml
<testsuites name="GUT" tests="42" failures="1" disabled="0" errors="0" time="3.214">
  <testsuite name="res://test/unit/test_health.gd"
             tests="5" failures="1" errors="0" time="0.124">
    <testcase classname="test_health"
              name="test_damage_deducts_correct_amount"
              time="0.012"/>
    <testcase classname="test_health"
              name="test_clamps_below_zero"
              time="0.014">
      <failure message="Expected 0 but was -5"
               type="AssertionFailed"/>
    </testcase>
  </testsuite>
</testsuites>
```

Standard JUnit XML - consumed by GitHub Actions test reporters,
Jenkins JUnit plugin, GitLab CI test report widget, etc.

Per the [GUT README](https://github.com/bitwes/Gut), GUT also
tracks pre-test errors / orphan nodes / unhandled signals - these
surface in the GUT panel and the JUnit report.

## CI integration

GitHub Actions example:

```yaml
jobs:
  gut-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Godot
        run: |
          GODOT=4.6.1-stable
          wget -q https://github.com/godotengine/godot/releases/download/${GODOT}/Godot_v${GODOT}_linux.x86_64.zip
          unzip -q Godot_v${GODOT}_linux.x86_64.zip -d godot
          mv "godot/Godot_v${GODOT}_linux.x86_64" godot/godot
          chmod +x godot/godot
      - name: Run GUT
        run: |
          mkdir -p artifacts
          ./godot/godot --headless -d \
            -s addons/gut/gut_cmdln.gd \
            -gdir=res://test \
            -gjunit_xml_file=artifacts/gut-junit.xml \
            -gexit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gut-junit
          path: artifacts/gut-junit.xml
      - uses: dorny/test-reporter@v1
        if: always()
        with:
          name: GUT
          path: artifacts/gut-junit.xml
          reporter: java-junit
```

For Godot 3.x projects, swap the engine version and use GUT 7.x.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forgetting `--headless` in CI | Godot tries to open a window; CI hangs / fails | Always `--headless` for CI runs |
| Forgetting `-gexit` | Godot stays open after the run; CI step never completes | Always `-gexit` for CI runs |
| Test scripts outside `extends GutTest` | Runner skips them silently | Per [GUT README](https://github.com/bitwes/Gut), every test script extends `GutTest` (or extends an inner class that does) |
| Test methods without `test_` prefix | Runner skips them silently | Per the same README, methods must be prefixed `test_` |
| Using GUT 9 on Godot 3.x (or 7 on 4.x) | Plugin won't load | Match engine + GUT major-version per the compatibility table in this skill |
| Stubbing without a double | `stub(...)` requires a doubled object | Use `double("res://script.gd").new()` first |
| Async tests without `await` | Coroutine completes before assertion | `await` the signal / timer, then assert |
| Asserting `assert_eq` on floats | Floating-point inequality | Use `assert_almost_eq(a, b, tol)` per the assertion table above |
| Skipping JUnit XML in CI | CI surfaces no per-test failure detail | Always emit `-gjunit_xml_file=…` and feed to a CI reporter |
| Tests that depend on autoload singletons | Cross-test contamination | Re-initialise / reset autoloads in `before_each` |

## Limitations

- **No official Godot test framework.** Unlike Unity (UTF) or
  Unreal (Automation), Godot does not ship a first-party
  GDScript test framework - GUT is community-maintained at
  [github.com/bitwes/Gut](https://github.com/bitwes/Gut) (MIT
  license). For platform-cert evidence trails, vendor / partner
  reviewers may ask for the framework's provenance.
- **GDScript-only.** C# Godot projects should use .NET test
  runners (xUnit / NUnit) - GUT is GDScript-first.
- **Godot version coupling.** GUT 9.x requires Godot 4.x; GUT 7.x
  requires Godot 3.4.x per the
  [README's Godot Versions section](https://github.com/bitwes/Gut).
  Bumping the engine usually bumps GUT.
- **Doubles depend on script paths.** `double("res://path.gd")`
  needs the script's `res://` path; doubling autoloads or engine
  C++ classes is not supported directly.
- **No common exit-code definition for engine failures.** A
  Godot crash mid-run gives exit 0 in some configurations - parse
  the JUnit XML for `failures>0` as the source of truth.
- **GUT panel inside editor is the canonical UX.** Running tests
  via `--headless` CI works but is slower per-test than the
  in-editor panel because Godot starts fresh each run.
- **gut.readthedocs.io page churn.** Direct deep links (e.g., a
  Configuration page) sometimes return 404 between releases - 
  the [project README on github.com](https://github.com/bitwes/Gut)
  is the most stable entry point.
