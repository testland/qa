---
name: jaeger-trace-tests
description: Author integration tests that query Jaeger for cross-service trace verification — Jaeger all-in-one Docker for CI (OTLP gRPC :4317 + HTTP :4318 ingest, query API on :16686), `/api/traces?service=X&operation=Y` query patterns, span set + parent-child + duration assertions. Pairs with `opentelemetry-trace-assertions` for in-process unit-level tests.
type: skill
archetype: S1
rating: 23
d6: 4
keywords:
  - jaeger
  - distributed-tracing
  - integration-testing
  - opentelemetry
  - trace-query
---

# jaeger-trace-tests

Jaeger ingests traces over OTLP and exposes a query API for
verification. Per the [Jaeger getting-started docs], the all-in-one
image *"combines collector and query components in a single process
and uses a transient in-memory storage for trace data"* — perfect
for CI.

## When to use

- E2E or integration test exercises multiple services and you need
  to verify the full distributed trace shape (not just per-process
  spans).
- Production observability stack uses Jaeger; tests should reflect
  the same query API your alerts/SLOs depend on.
- Smoke test after instrumentation changes — confirm spans actually
  reach Jaeger (not just the SDK exporter).

## Step 1 — Run Jaeger all-in-one in CI

Per the [Jaeger getting-started docs]:

```bash
docker run --rm --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 5778:5778 \
  -p 9411:9411 \
  cr.jaegertracing.io/jaegertracing/jaeger:2.17.0
```

| Port | Purpose |
|---|---|
| 16686 | Jaeger UI + query HTTP API |
| 4317 | OTLP/gRPC ingest |
| 4318 | OTLP/HTTP ingest |
| 5778 | Sampling config |
| 9411 | Zipkin compatibility (B3 ingest) |

GitHub Actions service:

```yaml
services:
  jaeger:
    image: cr.jaegertracing.io/jaegertracing/jaeger:2.17.0
    ports:
      - 16686:16686
      - 4317:4317
      - 4318:4318
```

## Step 2 — Configure SDK to ship to Jaeger

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True))
)
trace.set_tracer_provider(provider)
```

For tests use `BatchSpanProcessor` + manual flush — Step 4 covers
flushing before query.

## Step 3 — Query API patterns

Jaeger query API endpoints:

| Endpoint | Returns |
|---|---|
| `GET /api/services` | List of service names |
| `GET /api/services/{service}/operations` | Operations for a service |
| `GET /api/traces?service=X&operation=Y&lookback=5m&limit=10` | Trace JSON |
| `GET /api/traces/{traceId}` | Single trace by ID |

Trace JSON response shape (selected fields):

```json
{
  "data": [{
    "traceID": "abc...",
    "spans": [
      {
        "spanID": "def...",
        "operationName": "order.create",
        "duration": 12345,
        "tags": [{"key": "order.item_count", "type": "int64", "value": 1}],
        "references": [{"refType": "CHILD_OF", "spanID": "parent..."}]
      }
    ]
  }]
}
```

## Step 4 — Force span flush before query

```python
def test_order_trace_visible_in_jaeger():
    with use_tracer():
        create_order(items=[item])

    # Ensure all spans are flushed to Jaeger before query
    trace.get_tracer_provider().force_flush(timeout_millis=5000)

    # Allow Jaeger ingest pipeline a moment
    time.sleep(0.5)

    resp = requests.get(
        "http://localhost:16686/api/traces",
        params={"service": "orders", "operation": "order.create", "lookback": "1m", "limit": 1},
    )
    traces = resp.json()["data"]
    assert len(traces) == 1
    span = next(s for s in traces[0]["spans"] if s["operationName"] == "order.create")
    tag = next(t for t in span["tags"] if t["key"] == "order.item_count")
    assert tag["value"] == 1
```

## Step 5 — Parent-child via `references`

Jaeger encodes parent links as `references` with `refType: "CHILD_OF"`.

```python
def parent_id(span):
    refs = span.get("references", [])
    child_of = [r for r in refs if r["refType"] == "CHILD_OF"]
    return child_of[0]["spanID"] if child_of else None

assert parent_id(db_span) == order_span["spanID"]
```

## Step 6 — Per-test trace isolation

CI runs many tests against shared Jaeger. Use unique
`service.name` per test or unique trace tag to scope queries:

```python
service_name = f"orders-test-{uuid4()}"
# ... configure SDK with this service name ...
# ... query Jaeger filtered by this service ...
```

In-memory storage is bounded by Jaeger's eviction; long test runs
should restart the container or accept eviction.

## Step 7 — Cleanup + retention

All-in-one uses transient memory storage per the [Jaeger
getting-started docs]. For longer test runs, mount a config:

```bash
docker run ... \
  -v /path/to/config.yaml:/jaeger/config.yaml \
  cr.jaegertracing.io/jaegertracing/jaeger:2.17.0 \
  --config /jaeger/config.yaml
```

Or restart the container between test workflows.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Query Jaeger immediately after exercise | Spans may not have shipped yet | `force_flush()` + brief sleep (Step 4) |
| Use prod Jaeger from CI | Test traces pollute prod data | Always Docker all-in-one (Step 1) |
| Hard-code service name across tests | Cross-test contamination on shared CI | Unique service.name per test (Step 6) |
| Assume long retention | All-in-one is in-memory; old traces evicted | Restart container or shorten test runs |
| Skip flushing pipeline | `BatchSpanProcessor` defers ship; queries miss spans | Always flush before query (Step 4) |

## Limitations

- Jaeger v2 changed deployment + binary names from v1; verify
  current image tag at the [Jaeger getting-started docs].
- Storage backends (Cassandra, Elasticsearch, OpenSearch, Badger)
  matter for production but Docker all-in-one is sufficient for CI.
- Jaeger UI is for humans; only query HTTP API in tests (no
  scraping HTML).

## References

- [Jaeger getting-started docs] — Docker run, ports, OTLP ingest
- [`opentelemetry-trace-assertions`](../opentelemetry-trace-assertions/SKILL.md) —
  in-process unit pattern
- [`zipkin-trace-tests`](../zipkin-trace-tests/SKILL.md) — sister
  skill for Zipkin-using teams
- [`trace-coverage-reviewer`](../../agents/trace-coverage-reviewer.md) —
  adversarial reviewer

[Jaeger getting-started docs]: https://www.jaegertracing.io/docs/latest/getting-started/
