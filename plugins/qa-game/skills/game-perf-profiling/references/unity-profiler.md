# Unity Profiler capture - module reference

Supporting detail for game-perf-profiling Step 1 (capture) and Step 2
(compare). Cited once here rather than repeated in the spine.

The Unity Profiler collects CPU, GPU, and memory data in the Editor or from a
connected target device
([docs.unity3d.com/Manual/Profiler.html](https://docs.unity3d.com/Manual/Profiler.html)).
Open it via **Window > Analysis > Profiler** (`Ctrl+7`).

Key modules to enable for a frame-time pass:

- **CPU Usage** - game thread, render thread, and job-system costs per frame.
- **GPU Usage** - available on Windows DirectX 11/12 and Linux OpenGL; breaks
  time into Opaque, Transparent, Shadows/Depth, Deferred, and PostProcess
  passes with DrawCalls counts and GPU ms per entry
  ([docs.unity3d.com/Manual/ProfilerGPU.html](https://docs.unity3d.com/Manual/ProfilerGPU.html)).
  GPU profiling is unavailable when Graphics Jobs are enabled in Player
  Settings; disable them before a profiling session.
- **Memory** - tracks managed heap, GC allocations per frame in bytes, and
  reserved vs. in-use breakdowns for textures, meshes, materials, and animation
  clips
  ([docs.unity3d.com/Manual/ProfilerMemory.html](https://docs.unity3d.com/Manual/ProfilerMemory.html)).

For standalone builds, use **Deep Profiling** or custom `ProfilerMarker`
instrumentation to capture application-specific events without the full
overhead of deep profiling.

Save the capture as a `.data` file (Profiler toolbar > Save). Retain it
alongside any Profile Analyzer `.pdata` export: the `.pdata` file does not
embed the original profile frames
([docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html](https://docs.unity3d.com/Packages/com.unity.performance.profile-analyzer@1.2/manual/index.html)).

Profile Analyzer (package `com.unity.performance.profile-analyzer`, Unity
2020.3+, install via Package Manager) aggregates and visualizes frame and
marker data from a set of Profiler frames, enabling side-by-side comparison of
two captures that the standard Profiler does not support. Open it via
**Window > Analysis > Profile Analyzer**. The Analyzer navigates to matching
markers in the Profiler when you click a marker entry; make a selection in the
Profiler beforehand for navigation to work.
