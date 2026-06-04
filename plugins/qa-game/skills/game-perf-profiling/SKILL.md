---
name: game-perf-profiling
description: "Profiles game builds against frame-time, memory, GPU draw-call, and GC-spike budgets using Unity Profiler + Profile Analyzer + Performance Testing package and Unreal Insights + stat commands. Establishes pass/fail thresholds (16.6 ms at 60 fps, 33.3 ms at 30 fps), writes automated performance regression tests that run in CI, and emits a structured budget report per SKU. Use when a title must hit a declared frame-time or memory budget before a milestone gate or platform-cert submission, or when a recent change needs a performance regression check."
rating: 25
d6: 4
keywords: ["game-performance", "frame-time", "profiling", "unity-profiler", "profile-analyzer", "performance-testing", "unreal-insights", "gc-spike", "draw-calls", "overdraw", "ci-regression"]
---

# game-perf-profiling

## Overview

Game performance QA verifies that a build meets its declared budgets across
every target SKU before milestone sign-off or platform-cert submission.
The performance category (category 4 in the
[game-test-categories-reference](../game-test-categories-reference/SKILL.md))
covers frame-time, memory, GPU, thermal, and battery axes. This skill covers
the two dominant engine stacks: Unity and Unreal Engine.

**Frame-time budget anchors** (from
[game-test-categories-reference](../game-test-categories-reference/SKILL.md)):

| Target frame rate | Frame-time budget |
|---|---|
| 60 fps | 16.67 ms per frame |
| 30 fps | 33.33 ms per frame |

Measuring averages is an anti-pattern: spikes hide in averages and cause
cert failures. Measure p99 (99th-percentile frame time) and sustained-window
maximums.

## Step 1: Unity - Capture with the Profiler

The Unity Profiler is a performance analysis tool that collects CPU, GPU,
and memory data either in the Editor or from a connected target device
([docs.unity3d.com/Manual/Profiler.html](https://docs.unity3d.com/Manual/Profiler.html)).

Open it via **Window > Analysis > Profiler** (or `Ctrl+7`). Key modules to
enable for a frame-time pass:

- **CPU Usage** - game thread, render thread, and job-system costs per frame.
- **GPU Usage** - available on Windows DirectX 11/12 and Linux OpenGL;
  breaks down time into Opaque, Transparent, Shadows/Depth, Deferred, and
  PostProcess passes with DrawCalls counts and GPU ms per entry
  ([docs.unity3d.com/Manual/ProfilerGPU.html](https://docs.unity3d.com/Manual/ProfilerGPU.html)).
  Note: GPU profiling is unavailable when Graphics Jobs are enabled in
  Player Settings; disable them before a profiling session
  ([docs.unity3d.com/Manual/ProfilerGPU.html](https://docs.unity3d.com/Manual/ProfilerGPU.html)).
- **Memory** - tracks managed heap, GC allocations per frame in bytes, and
  reserved vs. in-use breakdowns for textures, meshes, materials, and
  animation clips
  ([docs.unity3d.com/Manual/ProfilerMemory.html](https://docs.unity3d.com/Manual/ProfilerMemory.html)).

For standalone builds, use **Deep Profiling** or custom `ProfilerMarker`
instrumentation to capture application-specific events without the full
overhead of deep profiling
([docs.unity3d.com/Manual/Profiler.html](https://docs.unity3d.com/Manual/Profiler.html)).

Save the capture as a `.data` file (Profiler toolbar > Save). Retain this
alongside any Profile Analyzer `.pdata` export: the `.pdata` file does not
embed the original profile frames
([docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html](https://docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html)).

## Step 2: Unity - Analyze with Profile Analyzer

Profile Analyzer (package `com.unity.performance.profile-analyzer`, Unity
2020.3+, install via Package Manager) aggregates and visualizes frame and
marker data from a set of Profiler frames, enabling side-by-side comparison
of two captures that the standard Profiler does not support
([docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html](https://docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html)).

Open it via **Window > Analysis > Profile Analyzer**.

Workflow for a regression check:

1. Load the **baseline** `.data` file as the left dataset.
2. Load the **candidate** `.data` file as the right dataset.
3. Compare median and p99 frame times per marker against the budget.
4. Flag any marker whose p99 exceeds the per-frame budget allocation.

The Analyzer attempts to navigate to matching markers in the Profiler when
you click a marker entry; you must make a selection in the Profiler
beforehand for navigation to work
([docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html](https://docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html)).

## Step 3: Unity - Automated regression with Performance Testing package

Add `"com.unity.test-framework.performance": "3.0.3"` to `Packages/manifest.json`
and reference `Unity.PerformanceTesting` in your assembly definition
([docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html](https://docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html)).

### Measure.Method (Edit Mode or Play Mode)

```csharp
[Test, Performance]
public void PathfindingCost_UnderBudget()
{
    Measure.Method(() => pathfinder.FindPath(start, goal))
        .WarmupCount(5)
        .MeasurementCount(20)
        .IterationsPerMeasurement(10)
        .Run();
}
```

- `WarmupCount(n)`: executes the method n times before recording to remove
  initialization overhead.
- `MeasurementCount(n)`: number of samples recorded; default is 7; 20+
  improves stability.
- `IterationsPerMeasurement(n)`: repeats the code within each measurement to
  extend execution time above the 1 ms sensitivity floor.

([docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html](https://docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html))

### Measure.Frames (Play Mode)

```csharp
[UnityTest, Performance]
public IEnumerator CombatScene_FrameTime_UnderBudget()
{
    yield return Measure.Frames()
        .WarmupCount(5)
        .MeasurementCount(60)
        .Run();
}
```

Target standard deviation below 5%; avoid measurements under 1 ms due to
environmental sensitivity
([docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html](https://docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html)).

Decorate tests `[Test, Performance]` for Edit Mode or `[UnityTest, Performance]`
for Play Mode coroutines. View results via **Window > Analysis > Performance
Test Report**.

### GC-spike detection

Enable the `ProfilerMarkers` method on `Measure.Method` to target
`GC.Alloc` markers specifically:

```csharp
Measure.Method(() => SpawnWave())
    .ProfilerMarkers("GC.Alloc")
    .MeasurementCount(20)
    .Run();
```

A passing frame should produce 0 bytes of GC allocation in hot gameplay
paths. Any non-zero sample is a regression candidate.

Disable VSync in Project Settings and remove cameras not needed for the
measurement to keep results consistent between runs
([docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html](https://docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html)).

## Step 4: Unreal - Stat commands for first-pass triage

Unreal Engine stat commands are entered into the PIE console while the
game runs
([dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine)):

| Command | Shows |
|---|---|
| `stat fps` | Frames per second counter |
| `stat unit` | Frame, Game thread, Draw (render thread), GPU, RHIT, and DynRes times; recommended starting point |
| `stat gpu` | GPU statistics for the frame |
| `stat scenerendering` | General rendering statistics; entry point for rendering bottleneck triage |
| `stat game` | How long the various gameplay ticks are taking |
| `stat memory` | Memory usage by subsystem |

`stat unit` is the first command to run on any new build: it identifies
whether the bottleneck is game-thread, render-thread, or GPU, and measures
how long the video card takes to render the scene
([dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine)).
Run in a non-debug build for accurate results.

## Step 5: Unreal - Deep analysis with Unreal Insights

Unreal Insights is a telemetry capture and analysis suite that captures
events from a project at high data rates
([dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine)).

Launch from the Editor via the **Trace/Insights Status Bar Widget** in the
bottom toolbar, or from the prebuilt binary at
`Engine\Binaries\[Platform]\UnrealInsights.exe`
([dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine)).

Key trace channels:

| Channel | Captures |
|---|---|
| CPU | Thread-level timing per task and function |
| GPU | Per-frame GPU timing |
| Memory | Allocation, reallocation, and deallocation events |
| Networking | Network traffic for multiplayer titles |
| Slate | UMG/Slate widget update costs |
| Asset loading | Asset load time per type |

Live sessions appear in the Session Browser with a "LIVE" status indicator;
Insights supports simultaneous connection to multiple sessions and records
streams automatically for later replay
([dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine)).

Primary views:

- **Timing Insights**: CPU and GPU performance tracks with frames, filters,
  timers, counters, and caller/callee information.
- **Memory Insights**: Reconstructs runtime memory usage patterns from
  traced allocation events.

([dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine))

## Step 6: GPU draw-call and overdraw budgets

### Unity

The GPU Usage module's Hierarchy view shows DrawCalls count and GPU ms per
rendering pass
([docs.unity3d.com/Manual/ProfilerGPU.html](https://docs.unity3d.com/Manual/ProfilerGPU.html)).
Typical mobile budget: under 100 draw calls per frame; PC/console budget
is title-specific but PostProcess and Transparent passes are common
over-budget culprits.

Overdraw (multiple pixels written per screen pixel per frame) is visible
when Transparent pass GPU ms is disproportionate to scene complexity.
Reduce by: lowering particle counts, using depth pre-pass, culling
off-screen transparency.

### Unreal

Run `stat scenerendering` to surface general rendering statistics as the
entry point for rendering bottleneck identification
([dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/stat-commands-in-unreal-engine)).
Follow with `stat gpu` to get per-pass GPU time, then use the GPU Visualizer
(`ProfileGPU` console command) for a hierarchical breakdown of GPU passes
to isolate overdraw-heavy translucent passes
([dev.epicgames.com/documentation/en-us/unreal-engine/gpu-profiling-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/gpu-profiling-in-unreal-engine)).

## Step 7: CI regression gate

### Unity

Run Performance Testing package tests in a headless Unity batch session:

```bash
unity -batchmode -runTests -testPlatform StandaloneWindows64 \
  -testResults results.xml -projectPath .
```

Parse `results.xml`; fail the build if any `PerformanceMeasurement` sample
set has a median or p99 exceeding the declared threshold. A zero-tolerance
`GC.Alloc` assertion on hot paths is a recommended gate: one stray allocation
per frame compounds to hundreds of KB/s under sustained play.

For stable CI numbers: disable VSync, remove unused cameras, set a fixed
Quality level, and disable hardware reporting in Player Settings
([docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html](https://docs.unity3d.com/Packages/com.unity.test-framework.performance@3.0/manual/index.html)).

### Unreal

Unreal Automation System (see
[unreal-automation-system](../unreal-automation-system/SKILL.md)) exposes a
`PerformanceCapture` test type. Combine with a CI step that launches Insights
in server mode, runs the target map for N frames, exports the trace, and
compares the exported GPU/CPU frame time histogram against stored baselines.

## Budget report template

Emit one row per profiled scenario per SKU:

| Scenario | SKU | Metric | Budget | Measured (p50) | Measured (p99) | Status |
|---|---|---|---|---|---|---|
| Combat encounter | PC High | Frame time | 16.67 ms | 11.2 ms | 18.4 ms | FAIL p99 |
| Combat encounter | PC High | GC alloc/frame | 0 B | 0 B | 128 B | FAIL p99 |
| Open-world traversal | PC High | Frame time | 16.67 ms | 13.1 ms | 15.9 ms | PASS |

A FAIL on p99 triggers a regression investigation before milestone sign-off.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Averaging frame time across a level | Spikes hide in averages and cause cert failures | Use p99 and sustained-window maximums |
| Profiling with Graphics Jobs enabled in Unity | GPU module is disabled; no GPU data collected | Disable Graphics Jobs before capture |
| GC alloc tolerance in hot paths | Compounds to MB/s under sustained play | Assert 0 B per frame in CI on hot paths |
| Running perf tests in debug builds (Unreal) | Inaccurate results; use non-debug builds | Profile in Development or Shipping builds |
| Single-device perf sign-off | Low-end SKU (Series S, Switch handheld) is the binding constraint | Run budget checks on every SKU in the compatibility matrix |

## Limitations

- Unity GPU profiling: Vulkan (Android, Linux, Windows), Metal (iOS/macOS),
  and WebGL are not supported; only DirectX 11/12 (Windows) and OpenGL
  (Linux) work
  ([docs.unity3d.com/Manual/ProfilerGPU.html](https://docs.unity3d.com/Manual/ProfilerGPU.html)).
- Unity Memory module detailed object statistics are unavailable in release
  builds
  ([docs.unity3d.com/Manual/ProfilerMemory.html](https://docs.unity3d.com/Manual/ProfilerMemory.html)).
- Profile Analyzer `.pdata` files do not embed original Profiler frames;
  retain `.data` files alongside them
  ([docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html](https://docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html)).
- Sony TRC and Nintendo Lotcheck thermal/battery performance gates are
  NDA-gated; consult the developer portal for current requirement numbers.
  Cited by stable ID "Sony TRC" and "Nintendo Lotcheck" per
  `docs/PLUGIN_AUTHORING.md` Step 4 fallback.
- Godot engine performance tooling is out of scope; see
  [godot-gut-tests](../godot-gut-tests/SKILL.md) for that engine's test
  framework.
