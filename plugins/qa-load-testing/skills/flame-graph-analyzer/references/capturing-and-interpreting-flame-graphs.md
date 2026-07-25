# Capturing and interpreting flame graphs per runtime

Deep reference for `flame-graph-analyzer` SKILL.md. Consult for the full
per-runtime capture wiring, the category-to-fix remediation catalog, and
worked interpretation cases beyond the single inline example.

## Per-runtime capture wiring

Each runtime produces flame-graph data from its own profiler. Export folded
stacks (`.txt`, one line per unique stack + sample count) wherever the profiler
supports it - that is the machine-readable form the analyzer reads.

### Python - py-spy

[py-spy](https://github.com/benfred/py-spy):

```bash
py-spy record -o flame.svg -d 30 --pid <pid>
# or run-and-record
py-spy record -o flame.svg -d 30 -- python app.py
# raw folded stacks for analysis
py-spy record -f raw -o folded.txt -d 30 --pid <pid>
```

### JVM - async-profiler

[async-profiler](https://github.com/async-profiler/async-profiler):

```bash
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,duration=30s,file=flame.html ...
# JFR output
java -agentpath:.../libasyncProfiler.so=start,event=cpu,file=profile.jfr ...
```

Output: HTML flame graph or JFR (Java Flight Recorder) format.

### Go - pprof

Go's built-in [pprof](https://pkg.go.dev/net/http/pprof):

```bash
# in-process: import _ "net/http/pprof"; http.ListenAndServe(":6060", nil)
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
```

Open the served URL, then VIEW -> Flame Graph.

### Node.js - clinic.js flame

[Clinic.js](https://clinicjs.org/):

```bash
npx clinic flame -- node app.js
# writes flame.html when the process exits
```

### Native (C/C++/Rust) - perf

`perf record` piped through Brendan Gregg's `stackcollapse-perf.pl` and
`flamegraph.pl` produces folded stacks and the SVG ([bg]).

[bg]: https://www.brendangregg.com/flamegraphs.html

### Folded stacks - the universal format

All major profilers can emit folded stacks: one line per unique stack with its
sample count.

```
main;handleRequest;serializeJson;Buffer.from 4521
main;handleRequest;dbQuery;parseRows 1832
main;handleRequest;authCheck;jwtVerify 904
```

`flamegraph.pl` consumes this format directly. Folded stacks are the canonical
machine-readable input for this skill's analysis.

## Category-to-fix remediation catalog

Once a hot leaf is classified, map the category to a typical fix:

| Category | Typical fix |
|---|---|
| CPU-bound hot algo | Cache the result; switch to a faster algorithm; move it out of the hot path. |
| Allocator pressure | Reuse buffers / pools; switch to streaming serialization; escape-analysis fixes for the JVM. |
| Lock contention | Reduce critical-section scope; move to lock-free data structures; per-shard locking. |
| Reflection overhead | Replace dynamic dispatch with cached call-sites or codegen. |
| Logging overhead | Lazy log-message construction; level-check before format. |

## Worked interpretation cases

### GC pressure

```
| Rank | Share | Stack (leaf)     | Category |
|-----:|------:|------------------|----------|
| 1    | 32%   | `gc.collect`     | Allocator pressure |
| 2    | 18%   | `dict.update`    | (callsite) |
| 3    | 14%   | `parse_response` | CPU-bound hot algo |
```

GC at 32% of samples means allocator pressure dominates. The fix is not making
any one function faster - it is reducing the **rate** of allocations from
`dict.update` and `parse_response` (object pooling, streaming parsing).

### Lock contention

```
| Rank | Share | Stack (leaf)          | Category |
|-----:|------:|-----------------------|----------|
| 1    | 41%   | `pthread_mutex_lock`  | Lock contention |
| 2    | 12%   | `cache.get`           | (callsite) |
```

41% of samples in lock acquisition. The fix is not "make `cache.get` faster" -
it is "reduce the contention" (per-shard locks, lock-free structures, or a
lock-free cache such as Caffeine for the JVM).

### Reflection / dynamic-dispatch overhead

```
| Rank | Share | Stack (leaf)                | Category |
|-----:|------:|-----------------------------|----------|
| 1    | 28%   | `Method.invoke` / `getattr` | Reflection overhead |
```

A common surprise - an ORM's reflective field access dominates the profile of
an otherwise simple endpoint. The fix is the ORM-equivalent of "compile the
mapping": cached method handles in the JVM, `__slots__` in Python, generated
SQL in Go.
