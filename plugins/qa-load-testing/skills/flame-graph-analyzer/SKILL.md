---
name: flame-graph-analyzer
description: "Reads CPU flame-graph output from py-spy (Python), async-profiler (JVM), Go pprof, or Node.js perf_hooks / clinic.js - identifies the hot path (top sample-time stack frames), classifies the bottleneck (CPU-bound vs lock contention vs allocator pressure), and proposes the next investigation step. Use when a perf regression has been bisected to a commit but the hot path inside that commit is unclear."
---

# flame-graph-analyzer

## Overview

Canonical flame-graph reference: [brendan-gregg-flame][bg]. Widest leaf = hot path.

[bg]: https://www.brendangregg.com/flamegraphs.html

Different runtimes produce flame graphs from different profilers:

| Runtime  | Profiler                                                    |
|----------|-------------------------------------------------------------|
| Python   | [py-spy](https://github.com/benfred/py-spy)                  |
| JVM      | [async-profiler](https://github.com/async-profiler/async-profiler) |
| Go       | Go's built-in `pprof` (`runtime/pprof`)                       |
| Node.js  | `clinic.js flame` (Clinic's bundled profiler)                |
| Native (C/C++/Rust) | `perf` / `dtrace` / Linux's eBPF tools           |

This skill is **language-agnostic** - it consumes the flame graph
output (SVG, JSON, or folded-stacks `.txt`) and surfaces a
hypothesis the engineer can act on.

## When to use

- A perf regression has been bisected but the introducing commit
  touches multiple functions; the team needs to know which function
  is the actual hot path.
- A load test under [`k6-load-testing`](../k6-load-testing/SKILL.md)
  or sibling shows latency growth, but the API code hasn't visibly
  changed - flame graph reveals the runtime cause.
- A production incident showed CPU saturation; the team has captured
  a profile and needs to triage before reducing fleet size.
- An `EXPLAIN ANALYZE` trace from a SQL query suggests CPU is the
  bottleneck rather than I/O - flame graph confirms.

## Step 1 - Capture the flame graph

For each runtime, the canonical capture command:

### Python - py-spy

```bash
py-spy record -o flame.svg -d 30 --pid <pid>
# OR run-and-record
py-spy record -o flame.svg -d 30 -- python app.py
```

Output: SVG + folded-stacks `.txt` (with `--format raw`).

### JVM - async-profiler

```bash
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,duration=30s,file=flame.html ...
# OR via the agent jar
java -agentpath:async-profiler/build/libasyncProfiler.so=start,event=cpu,file=profile.jfr ...
```

Output: HTML flame graph or JFR (Java Flight Recorder) format.

### Go - pprof

```bash
# In-process: import _ "net/http/pprof" + http.ListenAndServe(":6060", nil)
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
```

Open the served URL → "VIEW → Flame Graph".

### Node.js - clinic.js flame

```bash
npx clinic flame -- node app.js
# Generates flame.html when the process exits.
```

### Folded stacks (universal format)

All major profilers can emit "folded stacks" - one line per unique
stack with its sample count:

```
main;handleRequest;serializeJson;Buffer.from 4521
main;handleRequest;dbQuery;parseRows 1832
main;handleRequest;authCheck;jwtVerify 904
```

Brendan Gregg's `flamegraph.pl` consumes this format directly.
Folded-stacks is the canonical machine-readable form for this
skill's analysis.

## Step 2 - Identify the hot path

Read the folded stacks (or extract from SVG / JSON), sort by sample
count, identify the **top 5 leaves** (bottom of stack - the actual
working code, not framework wrappers).

```bash
# Top 5 leaves by sample count
sort -k2 -n -r folded.txt | head -5
```

Example output:

```
main;handleRequest;serializeJson;JSON.stringify   4521
main;handleRequest;dbQuery;Array.from              2103
main;handleRequest;dbQuery;parseRows               1832
main;authCheck;jwt.verify;crypto.createHash        904
main;handleRequest;serializeJson;Buffer.from       312
```

## Step 3 - Classify the bottleneck

For each hot path, the sample-time signature points to a category:

| Category            | Signature in flame graph                                   |
|---------------------|-------------------------------------------------------------|
| **CPU-bound (hot algo)** | A wide leaf in user code (e.g. a regex, a JSON serializer, a hash function). |
| **Allocator pressure** | Wide GC frames (`gc::scavenge`, `Java GC`, `Python's gc.collect`). |
| **Lock contention** | Wide synchronization frames (`pthread_mutex_lock`, `Object.wait`, `parking`). |
| **I/O wait misclassified** | If the profiler is on-CPU only, I/O blocks won't appear. Switch to wall-clock profiling. |
| **Reflection / dynamic dispatch overhead** | Wide `reflection.invoke`, `method_missing`, `getattr` chains. |
| **Logging overhead** | Wide `log.format`, `Logger.debug`, JSON serialization for log lines. |

## Step 4 - Propose remediation

Map category → typical fix:

| Category              | Typical fix                                                |
|-----------------------|------------------------------------------------------------|
| CPU-bound hot algo    | Cache the result; switch to a faster algorithm; move out of the hot path. |
| Allocator pressure    | Reuse buffers / pools; switch to streaming serialization;  |
|                       | escape-analysis fixes for the JVM.                          |
| Lock contention       | Reduce critical-section scope; move to lock-free data structures; per-shard locking. |
| Reflection overhead   | Replace dynamic dispatch with cached call-sites or codegen. |
| Logging overhead      | Lazy log message construction; level-check before format.   |

## Output format

```markdown
## Flame graph analysis - `<profile-source>`

**Runtime:** python | jvm | go | node | native
**Profile duration:** Ns (or per-request)
**Top sampled paths:**

| Rank | Sample share | Stack (leaf) | Category |
|-----:|-------------:|--------------|----------|
| 1    | 38%          | `JSON.stringify` (in `serializeJson`) | CPU-bound hot algo |
| 2    | 17%          | `Array.from` (in `dbQuery`)            | Allocator pressure |
| 3    | 15%          | `parseRows` (in `dbQuery`)             | CPU-bound hot algo |
| 4    | 8%           | `jwt.verify` (in `authCheck`)          | CPU-bound hot algo (crypto) |
| 5    | 3%           | `Buffer.from` (in `serializeJson`)     | Allocator pressure |

### Hypothesis

The top hot path (`JSON.stringify` at 38% sample share) is the
load-bearing cost. The serialization path also dominates rank 5
(`Buffer.from` at 3%) - the serialize step accounts for ~41% of
sampled time combined.

### Recommended next step

1. **Switch to a streaming JSON serializer** (e.g. `fast-json-stringify`
   in Node, `orjson` in Python, Jackson's `JsonGenerator` in JVM)
  - eliminates intermediate string allocation and runs ~2-5x faster
   on benchmark-typical payloads.
2. Re-profile after the change; expect rank 1 to drop below 10%.
3. Hand off to [`perf-budget-gate`](../perf-budget-gate/SKILL.md)
   to confirm the regression delta closes.
```

## Examples

### Example 1: GC pressure

```markdown
| Rank | Share | Stack (leaf)                  | Category |
|-----:|------:|-------------------------------|----------|
| 1    | 32%   | `gc.collect`                   | Allocator pressure |
| 2    | 18%   | `dict.update`                  | (callsite) |
| 3    | 14%   | `parse_response`               | CPU-bound hot algo |
```

GC at 32% of samples → allocator pressure dominates. The fix isn't
making any one function faster - it's reducing the **rate** of
allocations from `dict.update` and `parse_response` (object pooling,
streaming parsing).

### Example 2: lock contention

```markdown
| Rank | Share | Stack (leaf)                            | Category |
|-----:|------:|-----------------------------------------|----------|
| 1    | 41%   | `pthread_mutex_lock`                     | Lock contention |
| 2    | 12%   | `cache.get`                              | (callsite) |
```

41% of samples in lock acquisition. The fix is **not** "make `cache.get`
faster" - it's "reduce the contention" (per-shard locks, lock-free
structures, or a lock-free cache like Caffeine for the JVM).

### Example 3: reflection / dynamic-dispatch overhead

```markdown
| Rank | Share | Stack (leaf)                    | Category |
|-----:|------:|---------------------------------|----------|
| 1    | 28%   | `Method.invoke` / `getattr`      | Reflection overhead |
```

A common surprise - an ORM's reflective field access dominates the
profile of an otherwise simple endpoint. The fix is the
ORM-equivalent of "compile the mapping" - cached method handles in
the JVM, `__slots__` in Python, generated SQL in Go.

## Anti-patterns

| Anti-pattern                                              | Why it fails                                                    | Fix |
|-----------------------------------------------------------|------------------------------------------------------------------|-----|
| Reading the SVG visually only, no quantitative data        | Easy to mis-judge widths; biases toward dramatic-looking deep stacks. | Always work from folded stacks; sort by sample count. |
| Profiling under-load is too low                            | One request / second can't expose contention or allocator pressure. | Profile under realistic load - pair with [`k6-load-testing`](../k6-load-testing/SKILL.md). |
| Optimizing rank 5 first because rank 1 looks "structural"  | Premature optimization; misses the dominant cost.                | Always start with rank 1; only descend if rank 1 is genuinely framework-bound (e.g. `event_loop`). |
| On-CPU profiler for an I/O-bound workload                  | I/O wait doesn't appear; flame graph shows what's running, not what's waiting. | Use wall-clock / off-CPU profiling for I/O-bound workloads. |
| Single 30-second capture under highly variable load         | Sample is unrepresentative.                                       | Capture multiple samples across the load-test duration; merge. |

## Limitations

- **Symbolication.** Without debug symbols, the flame graph shows
  hex addresses. Always profile with debug info enabled in CI builds
  intended for analysis.
- **Inlining.** Aggressive inlining (especially in the JVM hot-path
  optimizer) can hide functions; the flame graph shows the
  *post-inlining* shape, which may not match the source.
- **Sampling vs. tracing.** Sample-based flame graphs give relative
  weights; for absolute timings of specific operations, use a tracer
  instead.

## References

- [Brendan Gregg's flame graphs page][bg] - canonical reference for
  the visualization technique.
- py-spy - https://github.com/benfred/py-spy
- async-profiler - https://github.com/async-profiler/async-profiler
- Go pprof - https://pkg.go.dev/net/http/pprof
- Clinic.js - https://clinicjs.org/
- [`k6-load-testing`](../k6-load-testing/SKILL.md) - runner that
  produces the load under which the profile is captured.
