# Per-engine record/replay APIs

Deep reference for `gameplay-recording-replay` SKILL.md - the full working
record, replay, and CI-assertion code for Unity, Unreal, and Godot. Consult
after Step 1 (determinism) is locked, when wiring the actual capture for your
engine.

## Unity - InputEventTrace

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

**CI regression assertion** (UTF `[UnityTest]` PlayMode fixture):

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

## Unreal - Replay System

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

**CI regression assertion** (in an
`unreal-automation-system`
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

## Godot - community deterministic pattern

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
# player.gd - replay
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

**CI regression assertion** - test harness in
`godot-gut-tests`:

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
