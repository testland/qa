---
name: latency-percentile-analyzer
description: "Interprets latency distributions from k6 load tests beyond the p95/p99 gate: reads percentile summaries and JSON exports to identify tail shape, computes the tail ratio (p99/p50) as a distribution-spread signal, detects bimodal distributions, explains coordinated omission and why naive p99 values are optimistic under sustained load, and distinguishes request-rate from concurrency models. Use when a k6 threshold passes but the system still feels slow, when p99 is suspiciously low during ramp-up, or when the team needs to explain why tail latency is high rather than just observing that it is."
metadata:
  keywords: "latency, percentile, tail-latency, p99, coordinated-omission, hdrhistogram, bimodal, load-testing, k6"
---

# latency-percentile-analyzer

[k6-metrics-ref]: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
[k6-thresholds]: https://grafana.com/docs/k6/latest/using-k6/thresholds/
[k6-trend-stats]: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#summary-trend-stats
[k6-end-of-test]: https://grafana.com/docs/k6/latest/results-output/end-of-test/
[hdrhistogram-readme]: https://github.com/HdrHistogram/HdrHistogram/blob/master/README.md

This skill walks the interpretation workflow for k6 latency distributions.
Passing a p95 threshold is necessary but not sufficient: a system with a
bimodal distribution, an inflated tail, or coordinated omission in its
measurement can pass every gate while hiding a real user experience problem.

## Step 1 - Expand the default percentile set

k6's default summary shows `avg, min, med, max, p(90), p(95)` per
[`--summary-trend-stats`][k6-trend-stats]. That range omits p99 and p99.9,
where tail pathologies live. Before interpreting anything, expand the output:

```bash
k6 run \
  --summary-trend-stats="avg,min,med,max,p(50),p(90),p(95),p(99),p(99.9)" \
  script.js
```

Or fix it in the script so every run uses the same stats:

```javascript
export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
};
```

(Per [k6-options reference][k6-trend-stats].)

For downstream analysis, export a JSON summary via `handleSummary`:

```javascript
export function handleSummary(data) {
  return { 'summary.json': JSON.stringify(data) };
}
```

k6 records `http_req_duration` (send + wait + receive), `http_req_waiting`
(TTFB only), and the sub-phase breakdown in separate Trend metrics per
[k6 metrics reference][k6-metrics-ref]. Always pull `http_req_waiting`
alongside `http_req_duration`: a high p99 on `http_req_duration` but a
normal p99 on `http_req_waiting` points to response-body transfer or
connection-reuse, not server processing.

k6's Trend metric stores all recorded values in a sorted slice and computes
percentiles via linear interpolation between neighboring values
(verified in `github.com/grafana/k6/blob/master/metrics/sink.go`). This is
accurate but stores every sample in memory; for very long runs with millions
of requests, use `--out json` and post-process with an external histogram
library.

## Step 2 - Read the distribution shape

Given an expanded summary, apply this reading order:

### 2a - Check the spread ratio (p99/p50)

Compute the **tail ratio**: `p(99) / p(50)`.

| Ratio | Signal |
|-------|--------|
| < 2x  | Narrow distribution - system is predictable under this load. |
| 2-5x  | Moderate tail - investigate at higher concurrency before signing off. |
| 5-10x | Wide tail - GC pauses, lock contention, or connection pool exhaustion are common causes. |
| > 10x | Bimodal candidate or coordinated omission artifact - see Steps 2b and 3. |

The tail ratio is a single number that summarizes how differently the slow
requests behave from the typical ones. A p99 of 800ms with a p50 of 100ms
(8x ratio) is a different system than a p99 of 220ms with p50 of 200ms
(1.1x ratio), even if both pass `p(95)<500`.

### 2b - Check for bimodal shape

A bimodal latency distribution has two peaks: one cluster around the fast
path and a second cluster at a much higher value. Common causes include:

- Cache miss vs. cache hit paths routed to the same endpoint.
- Two backend tiers with very different response times (in-process vs.
  remote database call).
- Retry amplification: first attempts fast, retried attempts slow.

Detection heuristics from the summary stats:

1. `p(50)` and `avg` diverge by more than 30%. The avg is pulled up by the
   slow cluster while the median sits in the fast cluster.
2. `p(90)` jumps sharply relative to `p(50)` but `p(99)` is not much higher
   than `p(90)`. The slow cluster has a tight ceiling.
3. The gap `p(95) - p(90)` is larger than `p(90) - p(50)`.

If you have access to the raw data (via `--out json`), plot a histogram with
narrow buckets (1ms or 5ms width) to confirm two modes visually before
acting on the heuristics.

### 2c - Cross-check the sub-metrics

Per [k6 metrics reference][k6-metrics-ref], `http_req_duration` equals the
sum of `http_req_sending` + `http_req_waiting` + `http_req_receiving`.

If `p(99)` of `http_req_duration` is high:

- High `http_req_waiting` p99: server is slow to produce the first byte -
  look at query plans, thread pool exhaustion, or upstream dependencies.
- High `http_req_blocked` p99: the VU is waiting for a free TCP slot before
  the request even starts - the client-side connection pool is the
  bottleneck, not the server.
- High `http_req_receiving` p99: server produced the response quickly but
  transfer is slow - large payload or network congestion.
- Normal sub-metrics but high total: check for keep-alive negotiation or
  TLS re-handshaking (`http_req_tls_handshaking`).

## Step 3 - Understand coordinated omission

This is the most important concept for interpreting load test p99 values.

### What coordinated omission is

In a typical load test, a virtual user sends a request and waits for the
response before sending the next one. When the server slows down, the VU
slows down with it. The VU and the server are **coordinating**: during a
slow period, fewer requests are issued, so fewer slow samples are recorded.

The result, illustrated in the [HdrHistogram README][hdrhistogram-readme]:
imagine a server that responds in 1ms for 100 seconds, then pauses for 100
seconds, then resumes. A naive measurement records 10,000 samples at 1ms
and 1 sample at 100,000ms. The naive histogram reports ~99.99% of results
at or below 1ms. The corrected picture is closer to ~50% at 1ms and 50%
distributed across the pause - because every user who arrived during the
pause experienced a long wait, not just the one whose request happened to
be in-flight.

The same phenomenon applies to VU-based load testing: under a server stall,
VUs queue up rather than issuing new requests at the original rate. The
requests that complete quickly before and after the stall dilute the tail.

### Why p99 lies during ramp-up

During the ramp-up stage, VU count is low and think-time between iterations
keeps the server below its saturation point. Samples accumulate at low
latencies. When VUs reach plateau, a fraction of requests experience queuing
delay, but by that time the histogram already has a large base of fast
samples. The p99 computed over the full run can look much better than the
p99 computed over the plateau-only window. Always inspect **time-windowed
summaries** (export raw JSON and bucket by timestamp) or use
`--summary-export` only from the plateau phase by separating ramp-up and
plateau into distinct scenario stages.

### How HdrHistogram corrects for it

HdrHistogram's `recordValueWithExpectedInterval(value, expectedInterval)`
detects when a recorded value exceeds the expected sampling interval and
synthesizes intermediate samples to represent the requests that were
waiting but never measured (per [HdrHistogram README][hdrhistogram-readme]).
The synthesized values are linearly spaced between `expectedInterval` and
the recorded value, filling in the distribution the VU-coordination hides.

k6 does not apply coordinated omission correction by default. Its Trend
sink stores raw values. If the test uses `sleep()` to model think-time
and a fixed VU count, the concurrency model naturally prevents one VU from
issuing a second request while waiting - so under a server pause, request
rate drops. This is the mechanism by which k6 results can understate tail
latency under bursty load.

For accurate tail measurement under realistic arrival rates, consider:

1. Using the k6 `scenarios` API with the `constant-arrival-rate` executor
   rather than `constant-vus`. This maintains request rate regardless of
   response time (though VUs still coordinate within each iteration).
2. Processing raw `--out json` data through a Java or Python HdrHistogram
   library with `recordValueWithExpectedInterval` for post-hoc correction.
3. Pair k6 results with server-side APM traces (which record every request
   independently of the VU's state) to cross-validate p99.

## Step 4 - Request-rate vs. concurrency models

Understanding which model your test uses changes how you interpret the
results.

| Model | k6 executor | How latency is measured |
|-------|-------------|------------------------|
| Concurrency (VU) | `constant-vus` (default) | VU holds a slot for the duration of the request. Throughput adapts to latency. |
| Request-rate | `constant-arrival-rate` | k6 issues requests at a fixed rate. If VUs run out, k6 reports `dropped_iterations`. |

With `constant-vus`, a high p99 might be masking the fact that **throughput
also dropped** during those slow periods. The system's capacity degraded;
the histogram only shows that some requests were slow, not that many were
never sent.

With `constant-arrival-rate`, slow requests cause VU starvation. Watch
`dropped_iterations` alongside percentiles. If `dropped_iterations > 0`,
the p99 you see is from the requests that did complete - it excludes the
dropped ones which represent an infinite-latency from the user's perspective.

A concrete read-back pattern using the `summary.json` export:

```bash
jq '{
  p50:    .metrics.http_req_duration.values["p(50)"],
  p95:    .metrics.http_req_duration.values["p(95)"],
  p99:    .metrics.http_req_duration.values["p(99)"],
  tail_ratio: (.metrics.http_req_duration.values["p(99)"] /
               .metrics.http_req_duration.values["p(50)"]),
  dropped: .metrics.dropped_iterations.values.count
}' summary.json
```

A non-null `dropped` count combined with a low tail ratio is a red flag:
the fast percentiles are artificially low because the slow requests were
never issued.

## Step 5 - Thresholds to gate on

Per [k6 thresholds][k6-thresholds], set thresholds on the metrics that
surface the patterns above:

```javascript
export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
  thresholds: {
    // Gate on p99 as well as p95 - the tail matters.
    http_req_duration:  ['p(95)<500', 'p(99)<1500'],
    // TTFB gate catches server-side slowness independently of payload size.
    http_req_waiting:   ['p(99)<1000'],
    // A blocked p99 > 50ms means connection pool exhaustion at the VU layer.
    http_req_blocked:   ['p(99)<50'],
    http_req_failed:    ['rate<0.01'],
    // Gate on dropped iterations when using constant-arrival-rate.
    dropped_iterations: ['count<10'],
  },
};
```

The `http_req_blocked` threshold catches a pathology that p95/p99 on
`http_req_duration` can obscure: requests that spend the majority of their
time waiting for a free socket at the client, not at the server.

## Anti-patterns

| Anti-pattern | Why it misleads | Fix |
|---|---|---|
| Reporting only `p(95)` in the summary | The 1-in-20 slowest requests are invisible. A p95 of 400ms with a p99 of 4000ms looks healthy. | Add `p(99)` and `p(99.9)` via `summaryTrendStats`. |
| Averaging across ramp-up and plateau | Low-load ramp-up samples dilute plateau tail. | Use separate scenarios or post-filter the JSON export by timestamp. |
| Ignoring `dropped_iterations` | Under `constant-arrival-rate`, unreported requests make p99 look better than reality. | Always include `dropped_iterations` in the summary export check. |
| Treating avg as representative | A bimodal distribution has no typical request; avg falls between the two modes. | Use med (p50) as the central tendency; use tail ratio to confirm shape. |
| Comparing p99 across different VU counts | Higher concurrency changes the distribution; the numbers are not comparable. | Normalize by `http_reqs` rate (RPS) and note the executor type alongside any p99 number. |

## References

- [k6 metrics reference][k6-metrics-ref] - full list of built-in metrics,
  types, and per-phase breakdown (`http_req_waiting`, `http_req_blocked`, etc.).
- [k6 thresholds][k6-thresholds] - threshold syntax, `p(N)` aggregation,
  `abortOnFail`.
- [k6 summary-trend-stats option][k6-trend-stats] - how to add `p(99)` and
  `p(99.9)` to the default CLI summary.
- [k6 end-of-test summary][k6-end-of-test] - summary modes, `handleSummary`
  for JSON export.
- [HdrHistogram README][hdrhistogram-readme] - coordinated omission
  explanation and `recordValueWithExpectedInterval` correction method.
- [`k6-load-testing`](../k6-load-testing/SKILL.md) - authoring k6 scripts,
  stages, and the basic threshold CI gate. This skill reads the output that
  one produces.
