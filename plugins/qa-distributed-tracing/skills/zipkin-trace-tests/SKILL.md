---
name: zipkin-trace-tests
description: "Author integration tests that query Zipkin for trace verification - Zipkin all-in-one Docker for CI, REST API (`/api/v2/traces`, `/api/v2/services`, `/api/v2/dependencies`), B3 propagation header tests (single-header and multi-header X-B3-* form), dependency-graph assertions. Use when the team uses Zipkin (legacy or Spring Cloud Sleuth heritage)."
type: skill
keywords:
  - zipkin
  - distributed-tracing
  - integration-testing
  - b3-propagation
  - trace-query
---

# zipkin-trace-tests

Zipkin is the original distributed-tracing system (predates
OpenTelemetry); still common in Java shops via Spring Cloud Sleuth
heritage. Per the [Zipkin quickstart docs], a single Docker command
provides the full server + UI.

## When to use

- Existing Spring Cloud Sleuth / Spring Boot Actuator setup uses
  Zipkin as the trace store.
- Team standardized on B3 header propagation (vs W3C Trace Context).
- Migrating from Zipkin to Jaeger / OpenTelemetry - these tests
  protect during cutover.

## Step 1 - Run Zipkin in CI

Per the [Zipkin quickstart docs]:

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

GitHub Actions service:

```yaml
services:
  zipkin:
    image: openzipkin/zipkin
    ports:
      - 9411:9411
```

## Step 2 - REST API endpoints

Per the [Zipkin API spec]:

| Endpoint | Returns |
|---|---|
| `GET /api/v2/services` | List of service names |
| `GET /api/v2/spans?serviceName=X` | List of operations |
| `GET /api/v2/traces?serviceName=X&spanName=Y&lookback=300000&limit=10` | List of traces |
| `GET /api/v2/trace/{traceId}` | Single trace |
| `GET /api/v2/dependencies?endTs=...&lookback=...` | Service dependency graph |
| `POST /api/v2/spans` | Submit spans (V2 JSON) |

`lookback` is in milliseconds.

## Step 3 - Configure SDK to ship to Zipkin

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.zipkin.json import ZipkinExporter

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(ZipkinExporter(endpoint="http://localhost:9411/api/v2/spans"))
)
trace.set_tracer_provider(provider)
```

OTLP ingest is also possible via Zipkin's compatibility port (port
9411 also accepts B3-format JSON via OTLP-to-Zipkin bridges).

## Step 4 - Query trace + assert shape

```python
import requests, time
from opentelemetry import trace

def test_order_trace_in_zipkin():
    with use_tracer():
        create_order(items=[item])

    trace.get_tracer_provider().force_flush(timeout_millis=5000)
    time.sleep(0.5)

    resp = requests.get(
        "http://localhost:9411/api/v2/traces",
        params={"serviceName": "orders", "spanName": "order.create",
                "lookback": 60000, "limit": 1},
    )
    traces = resp.json()  # list of lists of spans
    assert len(traces) == 1
    spans = traces[0]
    create_span = next(s for s in spans if s["name"] == "order.create")
    assert create_span["tags"]["order.item_count"] == "1"  # tags are strings in Zipkin V2
```

Note Zipkin V2 stores tag values as strings (vs Jaeger's typed
tags). Cast in assertions accordingly.

## Step 5 - B3 propagation header tests

Per the [B3 propagation spec]:

**Multi-header form:**
- `X-B3-TraceId`: 32 or 16 lower-hex characters
- `X-B3-SpanId`: 16 lower-hex characters
- `X-B3-ParentSpanId`: 16 lower-hex characters (absent on root)
- `X-B3-Sampled`: `1` (accept) or `0` (deny)
- `X-B3-Flags`: `1` for debug

**Single-header form:**
```
b3: {TraceId}-{SpanId}-{SamplingState}-{ParentSpanId}
```

Example:
```
b3: 80f198ee56343ba864fe8b2a57d3eff7-e457b5a2e4d86bd1-1-05e3ac9a4f6e3b90
```

Per the [B3 propagation spec], sampling values: `1` accept, `0`
deny, `d` debug, absent = defer.

Test both forms:

```python
def test_b3_single_header_propagates():
    headers = {"b3": f"{trace_id}-{span_id}-1-{parent_id}"}
    resp = requests.get("http://localhost:8080/orders", headers=headers)

    # Verify downstream service preserved trace_id
    time.sleep(0.5)
    traces = requests.get(
        "http://localhost:9411/api/v2/trace/" + trace_id
    ).json()
    assert any(s["traceId"] == trace_id for s in traces)
```

## Step 6 - Dependency graph assertion

Zipkin computes service dependencies from observed traces:

```python
def test_orders_calls_payments():
    # Exercise the cross-service flow
    create_order_with_payment()
    trace.get_tracer_provider().force_flush(5000)
    time.sleep(2.0)  # dependency aggregation can be lazy

    end_ts = int(time.time() * 1000)
    deps = requests.get(
        "http://localhost:9411/api/v2/dependencies",
        params={"endTs": end_ts, "lookback": 60000},
    ).json()

    pair = next(
        (d for d in deps if d["parent"] == "orders" and d["child"] == "payments"),
        None,
    )
    assert pair is not None
    assert pair["callCount"] >= 1
```

Note dependency calculation is **lazy + aggregated** - may need a
short delay or explicit dependency-aggregation trigger depending on
storage backend. In-memory storage computes inline; Cassandra
backend uses Spark batch.

## Step 7 - Per-test isolation

```python
service_name = f"orders-test-{uuid4()}"
# ... use this service_name in SDK config + Zipkin queries ...
```

Same pattern as Jaeger; Zipkin in-memory storage is bounded.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Query immediately after exercise | Spans batch-shipped; not yet in Zipkin | force_flush + sleep (Step 4) |
| Assert tag values as integers | Zipkin V2 tags are all strings | Cast or compare as string (Step 4) |
| Test only multi-header B3 | Modern services use single-header form | Test both forms (Step 5) |
| Expect dependency-graph immediately | Aggregation is lazy on most backends | Allow ≥2s delay (Step 6) |
| Hard-code production Zipkin URL in tests | Test traces pollute prod | Docker all-in-one only (Step 1) |

## Limitations

- Zipkin V2 JSON does not natively carry `span.kind` as an
  enumerated field; encoded as `kind` string ("CLIENT" / "SERVER" /
  etc.). Cross-check the [Zipkin API spec] for current schema.
- B3 multi-header is being phased out by some libraries in favor of
  single-header `b3:`. Track per-language SDK behavior.
- Zipkin's storage retention varies per backend; in-memory evicts on
  pressure.

## References

- [Zipkin quickstart docs] - Docker run, port 9411
- [Zipkin API spec] - REST endpoints
- [B3 propagation spec] - header formats, sampling values
- [`opentelemetry-trace-assertions`](../opentelemetry-trace-assertions/SKILL.md),
  [`jaeger-trace-tests`](../jaeger-trace-tests/SKILL.md) - sister skills
- [`trace-coverage-reviewer`](../../agents/trace-coverage-reviewer.md)

[Zipkin quickstart docs]: https://zipkin.io/pages/quickstart.html
[Zipkin API spec]: https://zipkin.io/zipkin-api/
[B3 propagation spec]: https://github.com/openzipkin/b3-propagation
