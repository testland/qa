# Unreal Insights - deep analysis reference

Supporting detail for game-perf-profiling Step 5. Cited once here rather than
repeated in the spine.

Unreal Insights is a telemetry capture and analysis suite that captures events
from a project at high data rates
([dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine)).

Launch from the Editor via the **Trace/Insights Status Bar Widget** in the
bottom toolbar, or from the prebuilt binary at
`Engine\Binaries\[Platform]\UnrealInsights.exe`.

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
streams automatically for later replay.

Primary views:

- **Timing Insights**: CPU and GPU performance tracks with frames, filters,
  timers, counters, and caller/callee information.
- **Memory Insights**: Reconstructs runtime memory usage patterns from traced
  allocation events.
