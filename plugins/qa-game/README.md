# qa-game

Game engine testing (Unity, Unreal, Godot), the six-category game-test taxonomy plus platform certification overview and checklist workflow (Sony TRC, Nintendo Lotcheck, MS XR, Steam Direct), multiplayer state machine coverage, and gameplay recording/replay

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [platform-cert-overview-reference](skills/platform-cert-overview-reference/SKILL.md) | The six canonical game-test categories (functional / compliance / compatibility / performance / localization / accessibility) plus multiplayer + content-rating cross-axes; submission workflow, severity vocab, bench matrix, and SLAs across Microsoft Xbox (XR v16.1), Sony TRC, Nintendo Lotcheck, and Steam Direct; and the building-a-cert-checklist workflow that maps a platform's requirement items to the categories. Public sources inline; gated NDA portals cited by stable ID |
| skill | [unity-test-framework](skills/unity-test-framework/SKILL.md) | Unity game-engine Test Framework (com.unity.test-framework v1.8): EditMode vs PlayMode, NUnit 3.5 assertions, [Test] / [UnityTest] / [UnityPlatform] attributes, batch-mode CLI, CI integration. Distinct from the ThrowTheSwitch Unity C library covered by qa-embedded/unity-test-framework-c |
| skill | [unreal-automation-system](skills/unreal-automation-system/SKILL.md) | Unreal Engine Automation Test Framework: five test categories (Unit / Feature / Smoke / Content Stress / Screenshot), IMPLEMENT_SIMPLE/COMPLEX_AUTOMATION_TEST macros, BDD-style Automation Spec (Describe / It / LatentIt), Automation Driver UI input simulation, Session Frontend, command-line -ExecCmds Automation invocation |
| skill | [godot-gut-tests](skills/godot-gut-tests/SKILL.md) | Author and run GUT (Godot Unit Test) for GDScript: install via Asset Library, extends GutTest + test_* methods, before_each / after_each lifecycle, parameterised tests, doubles + stubs + spies, command-line runner (`-d -s addons/gut/gut_cmdln.gd -gdir=res://test -gjunit_xml_file -gexit`), JUnit XML, CI integration. Godot 4.x = GUT 9.x; Godot 3.x = GUT 7.x |
| skill | [multiplayer-state-machine-coverage](skills/multiplayer-state-machine-coverage/SKILL.md) | Build a coverage matrix for connect / authority-handoff / disconnect / reconnect / host-migration paths across Unity NGO, Unreal replication, and Mirror Networking; cross with latency / loss / drop fault matrix; map to Xbox XR-067 / XR-074 / XR-064 / XR-045 / XR-015 cert clauses; emit go / no-go gate |
| skill | [gameplay-recording-replay](skills/gameplay-recording-replay/SKILL.md) | Build a deterministic gameplay record/replay artefact for regression tests, bug repros, or spectator/esports - Unity InputEventTrace, Unreal Replay System (DemoRec / DemoPlay / NetworkReplayStreamer), Godot community deterministic-RNG + InputEvent pattern. CI loop hashes final state vs baseline; replay header pins build hash + format version |
| skill | [game-perf-profiling](skills/game-perf-profiling/SKILL.md) | Game performance profiling + budgets: frame-time, Unity Profiler / Performance Testing, Unreal Insights. |
| agent | [game-test-scenario-author](agents/game-test-scenario-author.md) | Authors game-engine tests end to end: detects the engine from project markers (Unity ProjectSettings, Unreal *.uproject, Godot project.godot), scaffolds the from-zero test tree when none exists (EditMode/PlayMode asmdefs, Unreal Tests/ + Build.cs wiring, Godot test/ + .gutconfig.json), then emits one scenario file per behavior spec in Unity Test Framework / Unreal Automation / Godot GUT, pairing with gameplay-recording-replay artefacts when present |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-game@testland-qa
```
