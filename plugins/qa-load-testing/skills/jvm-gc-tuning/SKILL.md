---
name: jvm-gc-tuning
description: "Diagnoses JVM garbage-collection behaviour under load: reads and interprets unified GC logs (-Xlog:gc*), selects the right collector (G1 vs ZGC vs Parallel vs Serial), tunes heap sizing and pause-time targets, quantifies allocation rate, and traces the GC-pause-to-latency-tail link using GCViewer and Java Flight Recorder (JFR). Use when a load test reveals p99/p999 latency spikes that correlate with GC activity, or when heap sizing and collector selection need justification before a performance baseline is locked."
rating: 24
d6: 4
keywords: ["jvm", "gc", "garbage-collection", "heap", "g1gc", "zgc", "latency", "jfr", "gcviewer", "load-testing"]
---

# jvm-gc-tuning

## Overview

JVM garbage collection is a common hidden cause of latency tail in load tests.
A JVM application that looks CPU-bound or I/O-bound in a flame graph may instead
be stalling on stop-the-world (STW) pauses: the request thread is live but blocked
while the collector scans live objects. This skill walks the full diagnostic
workflow from log capture through collector selection to heap sizing and tool
analysis.

**Upstream:** pair with [`flame-graph-analyzer`](../flame-graph-analyzer/SKILL.md)
when GC frames appear as wide leaves in the async-profiler output.
**Downstream:** hand tuned JVM flags to the load runner
([`k6-load-testing`](../k6-load-testing/SKILL.md), [`gatling-load-testing`](../gatling-load-testing/SKILL.md))
to re-run the baseline after changes.

## Step 1 - Enable unified GC logging

Java 9+ replaced the legacy `-XX:+PrintGCDetails` family with the unified logging
framework. The canonical capture command, per the
[Java 21 `java` man page](https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html):

```bash
# Minimum useful capture (info level, timestamped, rotating files)
java -Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=5,filesize=20M \
     -Xms4g -Xmx4g \
     -jar app.jar
```

Recommended tag set for GC diagnostics:

| Tag | What it adds |
|-----|-------------|
| `gc` | Every collection event + pause time |
| `gc+heap` | Heap occupancy before/after each GC |
| `gc+phases` | Phase breakdown inside each pause (G1/ZGC) |
| `gc+age` | Object age histograms (tenuring threshold) |
| `gc+alloc+profiling` | Top allocation call sites (requires `-Xlog:gc+alloc+profiling=debug`) |

For a single diagnostic capture that covers all these tags:

```bash
java -Xlog:gc*,gc+phases,gc+heap,gc+age,gc+alloc+profiling=debug:file=gc_full.log:time,uptime,pid,level \
     -jar app.jar
```

Legacy flags (`-XX:+PrintGCDetails`, `-XX:+PrintGCTimeStamps`) still compile in Java 21
but are deprecated. Migrate to `-Xlog:gc*` before Java 25.

## Step 2 - Read the GC log: key signals

A G1 GC log line at `info` level looks like:

```
[2.415s][info][gc] GC(3) Pause Young (Normal) (G1 Evacuation Pause) 512M->320M(2048M) 12.453ms
```

Fields:

| Field | Meaning |
|-------|---------|
| `2.415s` | Uptime at pause start |
| `GC(3)` | Monotonic GC event counter |
| `Pause Young (Normal)` | Pause type (Young / Mixed / Full) |
| `512M->320M(2048M)` | Heap before -> after (heap capacity) |
| `12.453ms` | Wall-clock pause duration (STW time) |

**Red flags to scan for first:**

- `Pause Full` - a full-heap STW collection; almost always a misconfiguration or
  heap exhaustion signal.
- Pause durations consistently above `MaxGCPauseMillis` target - G1 is missing its
  goal; see Step 4.
- Heap after GC is consistently above 70-80% of capacity - heap is undersized or
  there is a live-set growth (possible leak).
- `(G1 Humongous Allocation)` triggers - objects larger than half a heap region are
  being allocated in the old generation directly, bypassing the young gen.

## Step 3 - Select the right collector

Per the [HotSpot GC Tuning Guide, Available Collectors](https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html):

| Situation | Collector | Flag |
|-----------|-----------|------|
| Small dataset (<= 100 MB heap) or single CPU | Serial | `-XX:+UseSerialGC` |
| Batch / offline job; throughput dominant; pauses >= 1 s acceptable | Parallel | `-XX:+UseParallelGC` |
| Server app; pause target 50-500 ms; default on modern JVMs | G1 | `-XX:+UseG1GC` (default) |
| Latency-critical service; pause target < 1 ms; heap 100 MB to 16 TB | ZGC (Generational) | `-XX:+UseZGC -XX:+ZGenerational` |

Oracle's guidance: "Allow the VM to select automatically unless you have strict
pause-time requirements. Adjust heap size first before changing collectors."
([Available Collectors](https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html))

### Pause-time vs throughput tradeoff

Per the
[Ergonomics section](https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics.html):
GC throughput overhead is calculated via `GCTimeRatio`:

```
max GC time fraction = 1 / (1 + GCTimeRatio)
```

`-XX:GCTimeRatio=19` targets at most 5% of CPU in GC (default for Parallel
collector). Setting `-XX:MaxGCPauseMillis` too aggressively on G1 reduces
young-gen size and increases GC frequency, which can hurt throughput even while
individual pauses shrink. This is the core tradeoff: shorter pauses require more
frequent collections.

ZGC eliminates this tradeoff for most workloads by doing nearly all work
concurrently, at the cost of slightly higher CPU and memory overhead compared to G1
([ZGC documentation](https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html)).

## Step 4 - Tune G1 for a pause-time target

From the
[G1 GC Tuning section](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html):

### Baseline low-latency profile (target < 50 ms pauses)

```bash
-XX:+UseG1GC
-Xms4g -Xmx4g                    # fixed heap avoids resize pauses
-XX:MaxGCPauseMillis=50           # pause-time target (statistical goal, not hard cap)
-XX:GCPauseIntervalMillis=200     # measure target over 200 ms window
-XX:G1NewSizePercent=10           # smaller young gen -> shorter pauses
-XX:G1MaxNewSizePercent=30
-XX:+G1UseAdaptiveIHOP            # let G1 learn IHOP from observed marking duration
```

### Key G1 flags

| Flag | Default | Effect |
|------|---------|--------|
| `-XX:MaxGCPauseMillis` | 200 | Pause-time target; G1 sizes young gen to meet this with high probability |
| `-XX:InitiatingHeapOccupancyPercent` | 45% | Triggers concurrent marking when old gen occupancy reaches this level |
| `-XX:G1HeapRegionSize` | ergonomic (~2048 regions) | Region size 1-512 MB (power of 2); objects >= half this become humongous |
| `-XX:G1MixedGCLiveThresholdPercent` | 85% | Regions with live occupancy above this are skipped during mixed GC |
| `-XX:G1HeapWastePercent` | 5% | Space-reclamation phase ends when reclaimable space drops below this |

**Important:** G1 is not a real-time collector. The pause target is a
statistical goal. Setting it below 10 ms without also switching to ZGC typically
causes G1 to thrash with very frequent tiny collections.

## Step 5 - Tune ZGC for sub-millisecond latency

From the [ZGC section](https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html):
ZGC performs all expensive work concurrently; pauses remain below 1 ms regardless
of heap size. The primary tuning lever is `-Xmx`.

```bash
-XX:+UseZGC -XX:+ZGenerational   # generational mode recommended
-Xms8g -Xmx8g
-XX:+AlwaysPreTouch               # pre-page memory at startup (reduces first-request jitter)
-XX:SoftMaxHeapSize=7g            # soft ceiling; GC keeps heap under this when possible
```

ZGC does NOT benefit from manual tuning of pause-time targets - those flags are
G1-specific. If ZGC pauses grow, increase `-Xmx` or reduce allocation rate.

## Step 6 - Analyse allocation rate

High allocation rate is the primary driver of GC frequency. Allocation rate
(MB/s) = heap consumed between GC events / time between events.

Compute from GC log heap lines:

```bash
# Extract heap-before values from gc.log
grep "Pause Young" gc.log \
  | awk -F'[-> ()ms]+' '{print $5, $7, $9, $10}' \
  # fields: before_MB after_MB capacity_MB pause_ms
```

Allocation rate signals:

| Rate | Implication |
|------|-------------|
| < 100 MB/s | Normal for most services |
| 100-500 MB/s | Watch for frequent young-gen collections |
| > 500 MB/s | Object pooling, streaming, or escape-analysis fixes needed |
| Sudden spike during load test | Request path creating large short-lived objects |

To identify the allocation call sites, enable `gc+alloc+profiling`:

```bash
-Xlog:gc+alloc+profiling=debug:file=alloc.log:time
```

Or use JFR (see Step 7) which captures allocation sites with lower overhead.

## Step 7 - Use Java Flight Recorder (JFR) for deep analysis

JFR provides structured GC event data with nanosecond resolution and captures
allocation stack traces. Per the
[JFR API documentation](https://docs.oracle.com/en/java/javase/21/jfapi/why-use-jfr-api.html),
JFR provides more context, better timing control, and richer event information
than text log files.

Enable JFR during a load test:

```bash
java -XX:StartFlightRecording=duration=120s,filename=recording.jfr,settings=profile \
     -jar app.jar
```

Key JFR event categories for GC analysis:

| Event category | What to look for |
|---------------|-----------------|
| `jdk.GarbageCollection` | Duration, cause, GC ID per collection |
| `jdk.G1HeapSummary` | Eden/survivor/old occupancy before and after |
| `jdk.ObjectAllocationInNewTLAB` | Allocation call stacks (sampled) |
| `jdk.ObjectAllocationOutsideTLAB` | Large object allocations (humongous) |
| `jdk.GCHeapSummary` | Heap used/committed at collection start |

Analyse the `.jfr` file with JDK Mission Control (GUI) or the `jfr` CLI:

```bash
# Print GC pause summary from recording
jfr print --events jdk.GarbageCollection recording.jfr | head -100

# Print allocation call sites (top allocators)
jfr print --events jdk.ObjectAllocationInNewTLAB recording.jfr \
  | sort -t'=' -k2 -rn | head -20
```

## Step 8 - Analyse with GCViewer

[GCViewer](https://github.com/chewiebug/GCViewer) parses GC log files and
computes summary metrics (throughput, pause time statistics, allocation rate,
promotion rate) from the same `-Xlog:gc*` output.

```bash
# Run GCViewer (requires Java)
java -jar gcviewer-1.36.jar gc.log
```

Key metrics GCViewer surfaces:

| Metric | GC health interpretation |
|--------|-------------------------|
| Throughput % | % of time NOT in GC; target > 95% for most services |
| Avg pause time | Mean STW duration; should be below `MaxGCPauseMillis` |
| Max pause time | Worst-case STW; the main driver of p99/p999 latency |
| Allocation rate (MB/s) | Matches analysis in Step 6 |
| Promotion rate (MB/s) | Objects escaping young gen; high rate fills old gen faster |

## Step 9 - Trace the GC-pause-to-latency-tail link

A GC pause does not appear in CPU flame graphs (threads are suspended). To
correlate GC pauses with HTTP latency spikes:

1. Align GC log timestamps with load runner request timing. Both must use wall
   clock (`-Xlog:gc*:decorators=time`; k6 uses Unix epoch).
2. In k6 output or Gatling simulation.log, find requests whose response time
   exceeds p99 baseline. Note their timestamps.
3. In GC log, find `Pause` events that overlap those windows. A 50 ms STW pause
   causes all concurrent requests to stall for 50 ms.
4. If the spikes co-occur with `Pause Full` or `Pause Young (Concurrent Start)`,
   the collector is failing to keep up with allocation rate; see Steps 4-6.
5. If spikes occur without matching GC pauses, GC is not the cause; escalate to
   [`flame-graph-analyzer`](../flame-graph-analyzer/SKILL.md) for CPU profiling.

## Output format

After completing the diagnostic, emit a findings block:

```markdown
## JVM GC diagnosis - <service-name>

**Collector:** G1 / ZGC / Parallel / Serial
**Heap:** Xms=Ng / Xmx=Ng (fixed or dynamic)
**Log capture window:** Ns during load test at Nrps

### Pause summary
| Metric | Observed | Target |
|--------|----------|--------|
| Mean pause | Nms | MaxGCPauseMillis |
| p99 pause | Nms | - |
| Max pause (cause) | Nms (Pause Full / Humongous / ...) | - |
| Throughput (% non-GC) | N% | >95% |

### Allocation rate
N MB/s average; peak N MB/s at N rps load.
Top allocator: <class>.<method> (<evidence: JFR or alloc log>)

### Finding
<One sentence: what is wrong and why it causes latency tail.>

### Recommended changes
1. <Flag change with before/after value>
2. <Heap resize or allocation fix>

### Verification
Re-run load test with the same scenario; confirm p99 drops below threshold and
throughput % improves. Feed results to perf-budget-gate.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tuning pause target without fixing allocation rate | Shorter target forces smaller young gen; collections become more frequent; throughput drops | Reduce allocation rate first; then lower pause target |
| Setting `-Xms` much smaller than `-Xmx` | Heap resize pauses during warm-up inflate early p99 | Set `Xms = Xmx` in production |
| Switching to ZGC without increasing heap | ZGC needs more headroom for concurrent reclamation | Add 20-30% extra heap when migrating from G1 to ZGC |
| Reading only `Pause Full` lines and ignoring Young pauses | Full GC is the most visible event but frequent young pauses add up to more cumulative stall | Compute cumulative GC time from all pause types |
| Diagnosing GC from flame graph alone | STW pauses do not appear in on-CPU profilers; threads are suspended | Correlate GC log timestamps with latency percentiles |

## Limitations

- GC log timestamps use wall-clock by default; under NTP corrections they can
  drift relative to request timestamps. Use monotonic uptime (`uptime` decorator)
  for precise GC-to-request correlation.
- `-Xlog:gc+alloc+profiling=debug` adds overhead (10-15% CPU). Use JFR allocation
  profiling in production-representative environments instead.
- ZGC sub-millisecond claim applies to STW pauses only. Concurrent GC threads
  compete for CPU with application threads; under heavy load this can increase
  latency via CPU contention even without STW pauses.
- GCViewer does not support ZGC log format for all ZGC-specific events; use JFR
  for ZGC deep analysis.

## References

- HotSpot GC Tuning Guide (Java 21) - introduction and goals:
  https://docs.oracle.com/en/java/javase/21/gctuning/introduction-garbage-collection-tuning.html
- Available Collectors + selection criteria:
  https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html
- G1 GC tuning flags and mixed GC mechanics:
  https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html
- ZGC characteristics and configuration:
  https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html
- Ergonomics and GCTimeRatio formula:
  https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics.html
- Unified logging syntax (-Xlog:gc*) in the java man page:
  https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- JFR API programmer's guide (event richness, timing, custom events):
  https://docs.oracle.com/en/java/javase/21/jfapi/why-use-jfr-api.html
- GCViewer open-source GC log analyser:
  https://github.com/chewiebug/GCViewer
- Upstream skill for CPU hot-path analysis:
  [`flame-graph-analyzer`](../flame-graph-analyzer/SKILL.md)
