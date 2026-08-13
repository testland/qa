---
name: jaeger-trace-tests
description: "Author integration tests that query a tracing backend for cross-service trace verification - Jaeger, Zipkin, or Grafana Tempo, same run-query-assert workflow. Jaeger all-in-one Docker for CI (OTLP gRPC :4317 + HTTP :4318 ingest, query API on :16686), `/api/traces?service=X&operation=Y` query patterns, span set + parent-child + duration assertions; Zipkin (:9411 REST API, B3 single/multi-header propagation tests, dependency graph) in references/zipkin.md; Tempo (TraceQL span selectors + structural operators, /api/search, single-binary Docker) in references/tempo.md. Use when verifying that a request produces the expected spans across service boundaries in a running Jaeger, Zipkin, or Tempo backend."
metadata:
  keywords: "jaeger, distributed-tracing, integration-testing, opentelemetry, trace-query"
---

# jaeger-trace-tests

Jaeger ingests traces over OTLP and exposes a query API for
verification. Per the [Jaeger getting-started docs], the all-in-one
image *"combines collector and query components in a single process
and uses a transient in-memory storage for trace data"* - perfect
for CI.

## When to use

- E2E or integration test exercises multiple services and you need
  to verify the full distributed trace shape (not just per-process
  spans).
- Production observability stack uses Jaeger; tests should reflect
  the same query API your alerts/SLOs depend on.
- Smoke test after instrumentation changes - confirm spans actually
  reach Jaeger (not just the SDK exporter).

## How to use

1. Start Jaeger all-in-one in CI as a Docker service (Step 1) - it exposes OTLP ingest on `:4317`/`:4318` and the query API on `:16686`.
2. Point the app's OpenTelemetry SDK at the collector's OTLP endpoint (Step 2).
3. Exercise the flow, `force_flush()` the span processor, and let the ingest pipeline settle before querying (Worked example).
4. Query `GET /api/traces?service=X&operation=Y` and assert on the returned span set and tags (Worked example); parent-child + duration assertions and the full query API live in [references/query-api-and-ci-wiring.md](references/query-api-and-ci-wiring.md).
5. Scope each test to a unique `service.name` so shared-CI trace data does not cross-contaminate (see references).

## Step 1 - Run Jaeger all-in-one in CI

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

The full port map (sampling `:5778`, Zipkin `:9411`) and the GitHub
Actions service block are in
[references/query-api-and-ci-wiring.md](references/query-api-and-ci-wiring.md).

## Step 2 - Configure SDK to ship to Jaeger

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

`BatchSpanProcessor` defers shipping, so the Worked example flushes
manually before querying.

## Worked example

Exercise the flow, force a flush, then query Jaeger and assert the span
set plus a tag value end to end:

```python
def test_order_trace_visible_in_jaeger():
    with use_tracer():
        create_order(items=[item])

    # Flush all spans to Jaeger before query
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

The `force_flush` + brief sleep is mandatory: `BatchSpanProcessor`
batches exports, so an immediate query races the ingest pipeline and
misses the span. For parent-child links and duration ceilings, see
[references/query-api-and-ci-wiring.md](references/query-api-and-ci-wiring.md).

## Other backends - Zipkin and Tempo

The same workflow (backend in Docker, ship OTLP, flush, query, assert)
applies to the other two mainstream OSS backends; only the query surface
changes:

- **Zipkin** (Spring Cloud Sleuth heritage; B3 propagation) - REST API on
  :9411, string-typed tags, dependency-graph assertions, B3
  single/multi-header tests: [references/zipkin.md](references/zipkin.md).
- **Grafana Tempo** - TraceQL span selectors with structural operators
  (`>>` descendant, `>` child) that Jaeger's flat span list cannot
  express, `/api/search` + `/api/traces/{id}`:
  [references/tempo.md](references/tempo.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Query Jaeger immediately after exercise | Spans may not have shipped yet | `force_flush()` + brief sleep (Worked example) |
| Use prod Jaeger from CI | Test traces pollute prod data | Always Docker all-in-one (Step 1) |
| Hard-code service name across tests | Cross-test contamination on shared CI | Unique service.name per test (references) |
| Assume long retention | All-in-one is in-memory; old traces evicted | Restart container or shorten test runs |
| Skip flushing pipeline | `BatchSpanProcessor` defers ship; queries miss spans | Always flush before query (Worked example) |

## Limitations

- Jaeger v2 changed deployment + binary names from v1; verify
  current image tag at the [Jaeger getting-started docs].
- Storage backends (Cassandra, Elasticsearch, OpenSearch, Badger)
  matter for production but Docker all-in-one is sufficient for CI.
- Jaeger UI is for humans; only query HTTP API in tests (no
  scraping HTML).

## References

- [Jaeger getting-started docs] - Docker run, ports, OTLP ingest
- [references/query-api-and-ci-wiring.md](references/query-api-and-ci-wiring.md) - full query API endpoints + trace JSON shape, parent-child + duration assertions, GitHub Actions service, per-test isolation, retention
- [references/zipkin.md](references/zipkin.md) - Zipkin REST API, B3
  propagation, dependency graph
- [references/tempo.md](references/tempo.md) - Tempo TraceQL + HTTP API
- `opentelemetry-trace-assertions` -
  in-process unit pattern

[Jaeger getting-started docs]: https://www.jaegertracing.io/docs/latest/getting-started/
