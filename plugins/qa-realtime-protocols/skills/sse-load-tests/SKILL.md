---
name: sse-load-tests
description: "Load-tests SSE endpoints at scale with k6 - measures concurrent-stream capacity, connection churn, and server memory pressure. Covers the HTTP/1.1 6-connection-per-origin browser ceiling vs HTTP/2 multiplexing, a custom k6 SSE client built on ReadableStream, and threshold gates for TTFB and data throughput. Use when validating whether a server can sustain N concurrent EventSource connections without connection starvation or memory growth."
metadata:
  keywords: "sse, server-sent-events, load-testing, k6, http2, connection-ceiling, realtime-protocols"
---

# sse-load-tests

Load-tests SSE endpoints with k6, covering the HTTP/1.1 connection-ceiling
problem that `server-sent-events-tests` flags but does not exercise under load.
The sibling skill verifies correctness (format, `Last-Event-ID`, `readyState`);
this skill drives concurrent virtual users against the same endpoint to find
capacity limits, connection churn costs, and memory growth under sustained
streams.

## When to use

- Pre-deploy gate: confirm the server handles the target concurrent-stream
  count before a release.
- Capacity planning: find the connection count at which `http_req_blocked`
  spikes (TCP slot exhaustion) or server RSS begins unbounded growth.
- HTTP/1.1 vs HTTP/2 comparison: measure whether enabling HTTP/2 on the
  server collapses the per-origin ceiling and reduces total TCP sockets.
- Regression check after changes to the streaming layer (buffer tuning,
  keep-alive settings, load-balancer upgrades).

## Overview: the HTTP/1.1 connection ceiling

Browsers cap concurrent HTTP/1.1 connections per origin at approximately
6 (Chrome, Firefox, Safari all implement this limit as a quality-of-service
constraint on shared TCP stacks). The [WHATWG SSE spec authoring notes][sse-authoring]
acknowledge this directly: "Clients that support HTTP's per-server connection
limitation might run into trouble when opening multiple pages from a site if
each page has an `EventSource` to the same domain."

Each `EventSource` holds one HTTP/1.1 connection open for the lifetime of
the stream. A page that opens several `EventSource` objects, or a multi-tab
scenario, will exhaust the pool and stall all other requests to the same
origin. HTTP/2 removes this constraint: [RFC 9113 section 1][rfc9113]
specifies that "a single HTTP/2 connection can contain multiple concurrently
open streams, with either endpoint interleaving frames from multiple streams,"
so all EventSource connections to an HTTP/2 origin share one TCP connection.

k6 uses Go's `net/http` transport which respects HTTP/2 upgrade and does not
enforce a browser-style per-origin limit; its VU concurrency is tunable, making
it suitable for finding the server-side ceiling independently of browser caps.

## Step 1 - Install k6

Follow the [k6 installation guide][k6-install] for your OS. Verify:

```bash
k6 version
```

The `k6/experimental/streams` module used below requires k6 v0.54.0 or later
(see [experimental/streams release note][k6-streams]).

## Step 2 - Write a k6 SSE client

k6 does not ship a native SSE protocol module. Build one using
[`ReadableStream` from `k6/experimental/streams`][k6-streams], which "provides
a way to define and consume streams of data within your test scripts" and lets
you "start processing raw data with Javascript bit by bit, as soon as it's
available, without needing to generate a full in-memory representation."

```js
// sse-load.js
import http from 'k6/http';
import { check } from 'k6';
import { ReadableStream } from 'k6/experimental/streams';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const sseEvents = new Counter('sse_events_received');
const eventLag  = new Trend('sse_event_lag_ms');

export const options = {
  scenarios: {
    // constant-vus holds N virtual users open for the full duration;
    // each VU maps to one persistent SSE connection.
    // See https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-vus/
    sustained_streams: {
      executor: 'constant-vus',
      vus: 50,
      duration: '60s',
    },
  },
  thresholds: {
    // TTFB: first byte of the event stream arrives within 500 ms for 95% of VUs
    // Metric reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
    'http_req_waiting': ['p(95)<500'],
    // Connection-slot starvation signal: VUs blocked waiting for a free TCP
    // slot should be negligible
    'http_req_blocked': ['p(99)<100'],
    // Overall error rate
    'http_req_failed': ['rate<0.01'],
  },
};

export default async function () {
  const startMs = Date.now();

  // Long-lived GET; set timeout generously (k6 default is 60 s per
  // https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/ ).
  // responseType 'text' streams body as string.
  const res = http.get('http://localhost:3000/api/events', {
    headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
    timeout: '70s',
  });

  check(res, {
    'status 200':            (r) => r.status === 200,
    'correct content-type':  (r) =>
      (r.headers['Content-Type'] || '').includes('text/event-stream'),
  });

  // Parse the body that arrived before k6 closed the response.
  // For a true streaming parse, replace this block with a ReadableStream
  // wrapping a streaming HTTP client (see Step 3).
  const lines = (res.body || '').split('\n');
  let count = 0;
  for (const line of lines) {
    if (line.startsWith('data:')) {
      count++;
      eventLag.add(Date.now() - startMs);
    }
  }
  sseEvents.add(count);
}
```

`http_req_waiting` is "time spent waiting for response from remote host
(a.k.a. 'time to first byte', or 'TTFB')" per the
[k6 metrics reference][k6-metrics]. It is the primary latency signal for
streaming endpoints because the client must receive the first byte before any
event is delivered.

## Step 3 - Streaming parse with ReadableStream (optional)

For servers that keep the connection open indefinitely (infinite stream),
wrap the body in a [`ReadableStream`][k6-streams] so k6 can process events
as they arrive and close the stream after N events rather than waiting for
the response to complete:

```js
import { ReadableStream } from 'k6/experimental/streams';
import { Counter } from 'k6/metrics';

const sseEvents = new Counter('sse_events_received');
const TARGET_EVENTS = 10; // drain after this many, then move on

export default async function () {
  // Open the SSE connection
  const res = http.get('http://localhost:3000/api/events', {
    headers: { Accept: 'text/event-stream' },
    timeout: '120s',
    responseType: 'none', // discard buffered body; we read from the stream
  });

  let buffer = '';
  let received = 0;

  const stream = new ReadableStream({
    async pull(controller) {
      // In a real integration, wire this to the chunked HTTP response.
      // k6's http module does not expose a streaming body reader natively;
      // for production use, combine with an xk6 extension or poll a shared
      // channel between the VU and a background goroutine.
      if (received >= TARGET_EVENTS) {
        controller.close();
        return;
      }
      // Simulate processing: parse lines from accumulated buffer
      // Replace this with actual chunk reads from your transport layer.
      controller.enqueue(buffer);
    },
  });

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = (value || '').split('\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        received++;
        sseEvents.add(1);
      }
    }
  }
}
```

Note: `ReadableStream` is experimental and "may introduce breaking changes
in future releases" per the [k6 streams docs][k6-streams]. Pin your k6
version in CI.

## Step 4 - Measure concurrent-stream capacity

Ramp VUs upward in stages to find the inflection point where `http_req_blocked`
climbs (TCP slot exhaustion on the server's accept queue) or `data_received`
per VU drops (back-pressure):

```js
export const options = {
  scenarios: {
    ramp_streams: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 100  },
        { duration: '60s', target: 500  },
        { duration: '60s', target: 1000 },
        { duration: '30s', target: 0    },
      ],
    },
  },
  thresholds: {
    'http_req_waiting':  ['p(95)<500'],
    'http_req_blocked':  ['p(99)<100'],
    'http_req_failed':   ['rate<0.02'],
    'data_received':     ['count>0'],
  },
};
```

`vus` (current active VUs) and `vus_max` (peak concurrent VUs) appear in
the k6 summary and Grafana dashboard automatically; no custom metric needed
([k6 metrics reference][k6-metrics]).

## Step 5 - Measure connection churn

Connection churn (clients that connect, receive a few events, then
disconnect and reconnect) stresses the server's connection-setup path more
than a stable pool. Model churn with short-lived iterations and a reconnect
loop:

```js
export const options = {
  scenarios: {
    churn: {
      executor: 'constant-arrival-rate',
      rate: 20,       // 20 new SSE connections per second
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 40,
    },
  },
};

export default function () {
  // Each iteration: connect, receive 3 events, disconnect.
  const res = http.get('http://localhost:3000/api/events', {
    headers: { Accept: 'text/event-stream' },
    timeout: '10s',
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  // Rapid disconnect after partial read - stresses server close path
}
```

`http_req_connecting` ("time spent establishing TCP connection to the remote
host") will reveal whether TLS+TCP handshake cost dominates at high churn
rates ([k6 metrics reference][k6-metrics]).

## Step 6 - Run and interpret results

```bash
k6 run sse-load.js
```

Key output fields:

| Metric | What it tells you |
|---|---|
| `http_req_waiting` p(95) | TTFB for the first event; high values mean server event-loop saturation |
| `http_req_blocked` p(99) | Time waiting for a free TCP slot; spikes mean connection exhaustion |
| `http_req_connecting` avg | Per-connection handshake cost; high under churn means TLS overhead |
| `data_received` total | Aggregate byte throughput; divide by duration and VU count for per-stream rate |
| `sse_events_received` | Custom counter; divide by `vus` to verify events are flowing to all streams |
| `http_req_failed` rate | Unexpected closes or non-200 responses under load |

A passing run shows `http_req_blocked` near 0 (no TCP slot contention),
`http_req_waiting` within TTFB threshold, and `sse_events_received` growing
linearly with VU count.

## Step 7 - HTTP/1.1 vs HTTP/2 comparison

Run the same scenario against the HTTP/1.1 and HTTP/2 endpoints. On HTTP/1.1,
`http_req_blocked` will rise as concurrent VUs approach the server's accept
queue depth. On HTTP/2, the single multiplexed TCP connection (per
[RFC 9113][rfc9113]) means `http_req_blocked` stays near 0 and
`http_req_connecting` drops sharply because new streams reuse the
existing connection rather than performing a fresh TCP+TLS handshake.

```bash
# HTTP/1.1 target
k6 run -e TARGET=http://localhost:3000/api/events sse-load.js

# HTTP/2 target (same VU count)
k6 run -e TARGET=https://localhost:3000/api/events sse-load.js
```

Compare the `http_req_connecting` and `http_req_blocked` summaries.

## Example output (passing run, 50 VUs, HTTP/2)

```
scenarios: (100.00%) 1 scenario, 50 max VUs, 1m30s max duration
default: 50 looping VUs for 1m0s (gracefulStop: 30s)

http_req_blocked............: avg=1.2ms   p(99)=8ms
http_req_connecting.........: avg=3.1ms   p(95)=12ms
http_req_waiting............: avg=42ms    p(95)=180ms
http_req_failed.............: 0.00%
data_received...............: 14 MB  230 kB/s
sse_events_received.........: 4800

thresholds:
  http_req_waiting p(95)<500    - OK
  http_req_blocked p(99)<100    - OK
  http_req_failed  rate<0.01    - OK
```

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Single short-duration iteration per VU | Does not model a persistent connection; misses steady-state memory growth | Use `constant-vus` with a multi-minute `duration` |
| No TTFB threshold | First-byte latency regression goes undetected | Gate `http_req_waiting p(95)` |
| Ignoring `http_req_blocked` | TCP slot exhaustion masked by passing error rate | Add `http_req_blocked p(99)` threshold |
| Testing HTTP/1.1 only | Misses multiplexing benefit; may over-provision TCP connections | Run the scenario against both HTTP/1.1 and HTTP/2 (Step 7) |
| Hard-coding VU count without a ramp | Misses the capacity cliff; first overload is discovered in production | Use `ramping-vus` to find the inflection point (Step 4) |

## Limitations

- k6 does not expose a native streaming body reader for HTTP responses;
  the `ReadableStream` pattern in Step 3 works for finite or polled streams
  but requires an xk6 extension for true chunked reads on an infinite stream.
- k6 VUs are goroutines, not browser tabs; the HTTP/1.1 6-connection-per-origin
  limit is a browser-side quality-of-service constraint (per
  [WHATWG SSE authoring notes][sse-authoring]) and does not apply to k6.
  This skill measures the server-side ceiling, which is what matters for
  capacity planning.
- Memory profiling (RSS growth per stream) requires an out-of-process tool
  (e.g., Prometheus + node_exporter, or `pmap`) running alongside k6; k6
  does not collect server-side process metrics.

## References

- [sse-authoring] WHATWG SSE spec, authoring notes (connection-pool warning):
  https://html.spec.whatwg.org/multipage/server-sent-events.html#authoring-notes
- [rfc9113] RFC 9113 - HTTP/2, multiplexing and stream concurrency:
  https://httpwg.org/specs/rfc9113.html
- [k6-streams] k6 experimental/streams - ReadableStream API:
  https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/streams/
- [k6-metrics] k6 built-in metrics reference (http_req_waiting, http_req_blocked,
  http_req_connecting, data_received, vus):
  https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- [k6-install] k6 installation guide:
  https://grafana.com/docs/k6/latest/get-started/installation/
- [k6-thresholds] k6 thresholds syntax:
  https://grafana.com/docs/k6/latest/using-k6/thresholds/
- [k6-scenarios] k6 scenarios and executor types:
  https://grafana.com/docs/k6/latest/using-k6/scenarios/
- [`server-sent-events-tests`](../server-sent-events-tests/SKILL.md) - correctness
  tests (event format, `Last-Event-ID`, `readyState`) that precede load testing

[sse-authoring]: https://html.spec.whatwg.org/multipage/server-sent-events.html#authoring-notes
[rfc9113]: https://httpwg.org/specs/rfc9113.html
[k6-streams]: https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/streams/
[k6-metrics]: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
[k6-install]: https://grafana.com/docs/k6/latest/get-started/installation/
[k6-thresholds]: https://grafana.com/docs/k6/latest/using-k6/thresholds/
[k6-scenarios]: https://grafana.com/docs/k6/latest/using-k6/scenarios/
