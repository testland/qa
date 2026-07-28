# JVM GC reference tables

Lookup tables for `jvm-gc-tuning`: G1 tuning flags, JFR event categories, and
the metrics GCViewer surfaces. The runnable capture and analysis commands live
in the main SKILL.md; these are the reference details each step points to.

## Key G1 flags (Step 4)

From the
[G1 GC Tuning section](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html):

| Flag | Default | Effect |
|------|---------|--------|
| `-XX:MaxGCPauseMillis` | 200 | Pause-time target; G1 sizes young gen to meet this with high probability |
| `-XX:InitiatingHeapOccupancyPercent` | 45% | Triggers concurrent marking when old gen occupancy reaches this level |
| `-XX:G1HeapRegionSize` | ergonomic (~2048 regions) | Region size 1-512 MB (power of 2); objects >= half this become humongous |
| `-XX:G1MixedGCLiveThresholdPercent` | 85% | Regions with live occupancy above this are skipped during mixed GC |
| `-XX:G1HeapWastePercent` | 5% | Space-reclamation phase ends when reclaimable space drops below this |

G1 is not a real-time collector; the pause target is a statistical goal. Setting
it below 10 ms without switching to ZGC typically causes G1 to thrash with very
frequent tiny collections.

## Key JFR event categories (Step 7)

| Event category | What to look for |
|---------------|-----------------|
| `jdk.GarbageCollection` | Duration, cause, GC ID per collection |
| `jdk.G1HeapSummary` | Eden/survivor/old occupancy before and after |
| `jdk.ObjectAllocationInNewTLAB` | Allocation call stacks (sampled) |
| `jdk.ObjectAllocationOutsideTLAB` | Large object allocations (humongous) |
| `jdk.GCHeapSummary` | Heap used/committed at collection start |

## Key GCViewer metrics (Step 8)

| Metric | GC health interpretation |
|--------|-------------------------|
| Throughput % | % of time NOT in GC; target > 95% for most services |
| Avg pause time | Mean STW duration; should be below `MaxGCPauseMillis` |
| Max pause time | Worst-case STW; the main driver of p99/p999 latency |
| Allocation rate (MB/s) | Matches the Step 6 allocation-rate analysis |
| Promotion rate (MB/s) | Objects escaping young gen; high rate fills old gen faster |
