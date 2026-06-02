---
name: gameplay-recording-replay-skill
description: "Build a deterministic gameplay record/replay test artefact for Unity, Unreal, or Godot - record a player session, save it to disk, replay it bit-for-bit, and assert that the resulting game state matches the original. Covers Unity Input System's InputEventTrace API (Enable / Disable / WriteTo / ReadFrom / Replay) for input-level capture, Unreal's Replay System (DemoRec / DemoPlay / DemoStop console commands plus DemoNetDriver + NetworkReplayStreamer, default storage at %LOCALAPPDATA%/<Project>/Saved/Demos) for replication-stream capture, and Godot's community-pattern deterministic-RNG + input-script replay since Godot ships no first-party replay system. Use when authoring a regression-test artefact for player-recorded sessions, building a netcode replay for spectator / esports, or producing reproducible bug repros for cert teams."
rating: 23
d6: 4
archetype: S3
keywords: ["replay", "recording", "input-trace", "demonet", "deterministic", "regression", "unity", "unreal", "godot", "esports"]
---

# gameplay-recording-replay-skill

## Overview

A **deterministic replay artefact** is a recorded session of
player input or replicated state that can be played back to
recreate the original game state. Three reasons games invest in
replays:

1. **Regression tests.** Record a scripted playthrough; replay it
   in CI; assert the final state matches the original. Catches
   physics drift, AI determinism breaks, save-format regressions.
2. **Bug repros.** Players record a session; QA replays it inside
   the build with the bug; cert teams attach the replay to the
   ticket.
3. **Esports / spectator / clip sharing.** Match replays surfaced
   in-product.

This is a **workflow** that produces, per engine, a working
record/replay setup plus a CI regression test that runs it.

The three engine surfaces differ:

| Engine | Recording surface | Stability of public docs |
|---|---|---|
| Unity | Input System's `InputEventTrace` (input-level) | Public - [com.unity.inputsystem@1.8 API](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.8/api/UnityEngine.InputSystem.LowLevel.InputEventTrace.html) |
| Unreal | Replay System (replication-stream level) - `DemoRec` / `DemoPlay` / `DemoStop` | Public - [Replays in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/replays-in-unreal-engine) |
| Godot | No first-party replay - community pattern: deterministic RNG seed + recorded `InputEvent` script | Community - Godot documentation does not ship a replay subsystem [author opinion, per [docs.godotengine.org](https://docs.godotengine.org/en/stable/)] |

Composes with:

- [`unity-test-framework`](../unity-test-framework/SKILL.md),
  [`unreal-automation-system`](../unreal-automation-system/SKILL.md),
  [`godot-gut-tests`](../godot-gut-tests/SKILL.md) - the host test
  framework the replay runs inside.
- [`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md) - 
  Unreal's Replay system shares `NetworkReplayStreamer` with its
  multiplayer stack; multiplayer fixtures can replay captured
  sessions.
- [`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md) - 
  replays are evidence artefacts for cert (Xbox **XR-003** title
  quality, attaching a repro to a CFR).

## When to use

- Producing a deterministic regression test for a story
  playthrough / level traversal / damage script.
- Building an in-product replay feature (spectator mode, instant
  replay, clip sharing).
- Producing reproducible repro artefacts for cert teams.
- Investigating a determinism regression - "this build diverges
  from the previous build's replay at frame 4823."

## Inputs

Gather before walking the workflow:

| Input | Where | Why |
|---|---|---|
| Engine + version | Project | Determines which API surface applies |
| Determinism baseline | Game design - is fixed-tick physics on? RNG seeded? AI deterministic? | Replays only work when the game's per-frame outputs are functions of (state + input) |
| Recording scope | Input-only? Full replication stream? | Trades off file size against determinism guarantees |
| Target storage location | `Application.persistentDataPath`, `%LOCALAPPDATA%/<Project>/Saved/Demos`, etc. | Where replay files land |
| Replay length budget | Seconds / minutes | InputEventTrace buffer sizing |
| Assertion model | Final-state hash? Per-frame? Checkpoint-only? | Drives the test harness shape |

## Workflow

### Step 1 - Establish determinism

Replays are worthless if the game is non-deterministic. Before
any recording work, lock down:

| Source of non-determinism | Lock-down |
|---|---|
| Variable timestep / `Time.deltaTime` | Run physics on `FixedUpdate` (Unity) / `TickGroup` (Unreal) with a fixed delta |
| Unseeded `Random` | Seed every RNG at session start; record the seed in the replay header |
| Async load timing | Force synchronous load during replay (`SceneManager.LoadScene` sync; `AssetRegistry::Tick` to drain) |
| Multithreaded game logic | Pin to one thread or commit to ordered consumption of results |
| Frame-rate-dependent FX | Tag visual-only systems and skip them in headless replay runs |

If you can't lock determinism, replay can still be useful as a
**visual debug** artefact, but it won't drive regression assertions.

### Step 2 - Unity path - InputEventTrace

Per the
[InputEventTrace API page](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.8/api/UnityEngine.InputSystem.LowLevel.InputEventTrace.html),
`InputEventTrace` "captures input events into an unmanaged memory
buffer". Critically: traces "must be disposed of (by calling
`Dispose()`) after use or they will leak memory on the unmanaged
(C++) memory heap".

**Recording:**

```csharp
using UnityEngine.InputSystem.LowLevel;

public class SessionRecorder : MonoBehaviour
{
    private InputEventTrace _trace;

    void Start()
    {
        // 4 MB buffer; grow up to 64 MB; default device = all
        _trace = new InputEventTrace(bufferSizeInBytes: 4 * 1024 * 1024,
                                     growBuffer: true,
                                     maxBufferSizeInBytes: 64 * 1024 * 1024);
        _trace.recordFrameMarkers = true;   // per the API page
        _trace.Enable();
    }

    public void StopAndSave(string path)
    {
        _trace.Disable();
        _trace.WriteTo(path);  // binary on-disk format
    }

    void OnDestroy()
    {
        _trace?.Dispose();  // required per the API page
    }
}
```

Per the same API page: "Enable `recordFrameMarkers` to insert
boundary events between frames, allowing proper temporal spacing
during playback" - without it, the replay will reissue events
back-to-back rather than respecting original frame timing.

**Replay:**

```csharp
public void Replay(string path)
{
    var trace = new InputEventTrace();
    trace.ReadFrom(path);                  // per the API page
    var controller = trace.Replay();       // returns ReplayController
    controller.PlayAllEventsAccordingToTimestamps();
    // or controller.PlayAllFramesOneByOne() for headless step
}
```

Per the API page, `Replay()` "begins event reconstruction,
returning a `ReplayController` object" - the controller exposes
play / pause / scrub / step methods.

**Determinism caveat.** InputEventTrace captures the *input* but
**not the game state**. A replay reproduces the same input events
in the same order - if the game's per-frame output is a pure
function of state + input + fixed delta + seeded RNG (Step 1),
the resulting state matches. If not, the replay diverges.

### Step 3 - Unreal path - Replay System

Per
[Replays in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/replays-in-unreal-engine),
Unreal's replay system captures the **replicated state stream**
via the `DemoNetDriver` and persists via `NetworkReplayStreamer`.
Default storage per the
[Recording Replays page](https://dev.epicgames.com/documentation/en-us/unreal-engine/recording-replays-in-unreal-engine):
`%LOCALAPPDATA%/<Project>/Saved/Demos`.

**Console commands** (per the same page):

| Command | Effect |
|---|---|
| `DemoRec <FriendlyName>` | "Initiate replay recording" - emits a `.replay` file under `Saved/Demos` |
| `DemoStop` | Stop recording / playback |
| `DemoPlay <FriendlyName>` | Play back a previously recorded replay |

The `<FriendlyName>` argument is the replay's identifier - per
the same page "helps distinguish between multiple recording
sessions".

**Programmatic recording** (per the
[Recording Replays page](https://dev.epicgames.com/documentation/en-us/unreal-engine/recording-replays-in-unreal-engine)):

```cpp
// In-game: start recording
GEngine->Exec(GetWorld(), TEXT("DemoRec MyMatch_v1"));

// Stop
GEngine->Exec(GetWorld(), TEXT("DemoStop"));

// Play back
GEngine->Exec(GetWorld(), TEXT("DemoPlay MyMatch_v1"));
```

For lower-level control, use `FNetworkReplayStreamer` directly
(per the same page) - the streamer exposes start / stop / pause /
goto-time methods and is the abstraction `DemoNetDriver` wraps.

**Time-shifting and scrubbing** are supported per the
[Playing Back Replays page](https://dev.epicgames.com/documentation/en-us/unreal-engine/playing-back-replays-in-unreal-engine) - playback isn't strictly forward-only; replays can be scrubbed
to arbitrary timestamps.

**Determinism semantics differ from Unity.** Unreal records the
**output of the network replication layer**, not raw input. The
replay reconstructs the *server's* view as it was streamed to
clients - it does **not** require the local game simulation to
be deterministic (the simulation already happened on the server).
This is why Unreal replays are practical for full multiplayer
matches whereas Unity InputEventTrace replays require pinning
deterministic single-player.

### Step 4 - Godot path - community deterministic pattern

Godot has no first-party replay subsystem comparable to
InputEventTrace or `DemoNetDriver` [author opinion, per the
[Godot documentation home](https://docs.godotengine.org/en/stable/)
which does not surface a testing/replay section]. The community
pattern is **deterministic RNG seed + recorded `InputEvent`
script**:

```gdscript
# recorder.gd
extends Node

var _events: Array = []
var _rng_seed: int

func _ready():
    _rng_seed = randi()
    seed(_rng_seed)

func _input(event: InputEvent):
    _events.append({
        "tick": Engine.get_physics_frames(),
        "event": event.duplicate(),
    })

func save_to(path: String) -> void:
    var f := FileAccess.open(path, FileAccess.WRITE)
    f.store_var({"seed": _rng_seed, "events": _events})
    f.close()
```

```gdscript
# player.gd — replay
extends Node

var _events: Array
var _cursor := 0

func load_from(path: String) -> void:
    var f := FileAccess.open(path, FileAccess.READ)
    var data = f.get_var()
    seed(data["seed"])
    _events = data["events"]

func _physics_process(_dt):
    while _cursor < _events.size() \
            and _events[_cursor]["tick"] <= Engine.get_physics_frames():
        Input.parse_input_event(_events[_cursor]["event"])
        _cursor += 1
```

Replay reissues `InputEvent`s on the same `Engine.get_physics_frames()`
tick they were captured. Combined with `seed(...)` re-applied
from the header and fixed `physics/common/physics_ticks_per_second`,
this gives equivalent determinism to Unity's InputEventTrace
pattern.

Test harness in
[`godot-gut-tests`](../godot-gut-tests/SKILL.md):

```gdscript
extends GutTest

func test_level_1_speedrun_replay_matches_baseline():
    var player := preload("res://src/replay_player.gd").new()
    player.load_from("res://test/fixtures/level1_baseline.replay")
    add_child(player)

    await get_tree().create_timer(10.0).timeout

    var final_state := %Game.get_state_hash()
    assert_eq(final_state,
              "abc123…baseline-hash…",
              "Replay produced same final state hash as baseline")
```

### Step 5 - Wire replays as CI regression assertions

Per engine, the CI loop is:

1. Check the replay file into the repo under `test/replays/`.
2. CI job loads the build, plays the replay, hashes the final
   game state.
3. Compare the hash against the baseline (also in repo).
4. Mismatch → CI fails the build.

Unity example (in a UTF `[UnityTest]` PlayMode fixture):

```csharp
[UnityTest]
public IEnumerator Level1_Speedrun_Replay_MatchesBaseline()
{
    var trace = new InputEventTrace();
    trace.ReadFrom("Assets/Tests/Replays/level1.trace");
    var ctl = trace.Replay();
    ctl.PlayAllEventsAccordingToTimestamps();

    yield return new WaitForSeconds(60f);  // length of replay

    var hash = GameStateHasher.Compute(GameStateRoot);
    Assert.AreEqual("baseline-hash-here", hash);
    trace.Dispose();   // per the API page
}
```

Unreal example (in an
[`unreal-automation-system`](../unreal-automation-system/SKILL.md)
test):

```cpp
LatentIt("Level1 replay reaches baseline checkpoint",
         [this](const FDoneDelegate& Done)
{
    GEngine->Exec(GetWorld(), TEXT("DemoPlay Level1_Baseline"));
    // poll for replay end via DemoNetDriver state, then
    // hash GameState and compare to baseline
    StartReplayWatchdog(Done);
});
```

Godot example - see Step 4 GUT fixture above.

### Step 6 - Define a fail-safe for replay drift

Real-world replays drift when:

- The game build version changed and the replay was recorded
  against an earlier version.
- A non-deterministic source slipped in (new async loader, new
  particle system using `Random`).
- The save format changed.

The harness must distinguish **bug-in-build** from
**replay-stale**. Encode the build hash + replay format version
in the replay header; CI rejects replays whose `replay_format <
current_format`, then either re-records (acceptable for visual
replays) or fails the build (regression test replays).

## Worked example - Unity speedrun regression

Inputs:

- **Engine:** Unity 6.0, Input System v1.8.
- **Determinism:** Physics at `FixedUpdate`, 60 Hz; RNG seeded
  from replay header; AI scripted via deterministic state
  machines.
- **Recording scope:** Input-only via InputEventTrace.
- **Storage:** `Assets/Tests/Replays/level1.trace` (committed to
  the repo).
- **Length budget:** 90 s - fits comfortably in 4 MB buffer
  (`recordFrameMarkers = true` per the
  [API page](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.8/api/UnityEngine.InputSystem.LowLevel.InputEventTrace.html)).
- **Assertion:** SHA-256 hash of `GameStateRoot.Serialize()` at
  T=90 s.

Step 1 - physics on FixedUpdate, RNG seeded from replay header,
async loads forced synchronous in headless mode.

Step 2 - recorder MonoBehaviour creates `InputEventTrace`, enables
on level start, writes to `level1.trace` on first level completion.

Step 5 - CI fixture (UTF `[UnityTest]`) reads the trace, replays
it, hashes the final `GameStateRoot`, compares to the baseline
hash committed in `Assets/Tests/Baselines/level1.hash`.

Step 6 - replay header includes `replay_format = 2` and
`build_hash = <git-sha>`. CI fails the build with a clear "replay
stale" message when format < 2 rather than silently passing.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Recording input without seeding RNG | Replay diverges by frame ~30 | Step 1 - every RNG seeded; seed in replay header |
| `InputEventTrace` without `Dispose()` | Memory leak per [API page](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.8/api/UnityEngine.InputSystem.LowLevel.InputEventTrace.html) - "must be disposed of … or they will leak memory on the unmanaged (C++) memory heap" | Always `using` / `Dispose()` |
| `InputEventTrace` without `recordFrameMarkers = true` | Replay reissues events back-to-back instead of respecting timing per [API page](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.8/api/UnityEngine.InputSystem.LowLevel.InputEventTrace.html) | Set `recordFrameMarkers = true` before `Enable()` |
| Comparing per-frame state instead of checkpoints | False-positive failures from float-precision drift | Hash at coarse-grained checkpoints (every N seconds or per level) |
| Treating Unreal replays as deterministic input replays | They're replication-stream replays - different determinism contract per [Replays page](https://dev.epicgames.com/documentation/en-us/unreal-engine/replays-in-unreal-engine) | Document the contract; don't assume input-level determinism |
| Storing replay format version implicitly | Replay-stale failures get misdiagnosed as bugs | Embed `replay_format` + `build_hash` in the header |
| Replays committed without their baselines | Asserting nothing | Commit `replay.trace` + `baseline.hash` as a pair |
| Replays > 30 min in CI | Replay run time dominates total job time | Split into checkpointed mini-replays |
| Replay scrubbing in test fixtures | Many engines don't expose deterministic scrubbing for tests | Linear playback only in regression fixtures; scrubbing is a feature, not a test surface |
| Replays storing PII | Saved player names / chat messages in attached repros | Strip PII from replay headers before sharing |

## Limitations

- **Input-level replay (Unity) and replication-stream replay
  (Unreal) are different contracts.** Unity replays depend on
  determinism; Unreal replays reconstruct the server's view and
  do not. Don't conflate them in a multi-engine team.
- **Godot has no first-party replay system** per the
  [Godot documentation home](https://docs.godotengine.org/en/stable/);
  the community pattern in Step 4 is sufficient for deterministic
  single-player but doesn't generalise to multiplayer.
- **Unreal replays bloat with high-bandwidth replication.** The
  `.replay` file under
  [`%LOCALAPPDATA%/<Project>/Saved/Demos`](https://dev.epicgames.com/documentation/en-us/unreal-engine/recording-replays-in-unreal-engine)
  grows with replicated-property volume - large open-world games
  produce GB-scale replays. Use checkpoint-only replays for
  long sessions.
- **Build-version coupling.** Replays recorded against build N
  rarely play correctly on build N+1 if the netcode / save
  format changed. Treat the replay file as a build-pinned
  artefact.
- **No public common exit-code definition** for replay-failed
  states in either Unity or Unreal - parse the test framework's
  result file (UTF NUnit XML or Unreal automation JSON) for the
  failure detail, don't rely on engine exit code.
- **No assertion API on Unreal `DemoNetDriver` replay completion**
  in public docs - the spec / latent-command harness must poll
  the demo time and time-out. See
  [Replays in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/replays-in-unreal-engine).
- **PII in replays.** Player chat, gamertags (per Microsoft
  [XR-046](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  modern-gamertag display rules), and inventory data can land
  inside replay attachments - strip before sharing with
  cert / publisher.
