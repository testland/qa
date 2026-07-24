---
name: tempo-trace-tests
description: "Authors integration tests that query Grafana Tempo for cross-service trace verification - TraceQL `{ }` span selectors targeting `span.`, `resource.`, and intrinsic fields; Tempo HTTP API (`/api/search` with `q=`, `/api/traces/{id}`) for span-set and attribute assertions; local Tempo via Docker single-binary (ports 4317/4318/3200). Use when the production observability stack uses Tempo as the trace backend and tests must verify distributed trace shape, span attributes, or service topology after instrumentation changes."
metadata:
  keywords: "tempo, traceql, distributed-tracing, integration-testing, opentelemetry, trace-query, grafana"
---

# tempo-trace-tests

Grafana Tempo is "an open source and high-scale distributed tracing backend"
([Grafana Tempo getting started](https://grafana.com/docs/tempo/latest/getting-started/)).
Its native query language, TraceQL, is "designed for selecting traces in Tempo"
([TraceQL overview](https://grafana.com/docs/tempo/latest/traceql/)).
This skill covers authoring tests that run TraceQL queries and HTTP API
calls against a local Tempo instance to assert on span attributes, service
topology, and trace duration.

## When to use

- E2E or integration test exercises multiple services and you need to verify
  the distributed trace shape (not just per-process spans).
- Production stack uses Tempo; tests should exercise the same TraceQL
  expressions your dashboards and alerts depend on.
- Smoke test after instrumentation changes - confirm spans reach Tempo and
  carry the correct attributes.
- You need structural assertions (parent-child, descendant) that Jaeger's
  flat span list API does not expose natively.

## Step 1 - Run Tempo single-binary in CI

The `grafana/tempo` single-binary example exposes
([docker-compose/single-binary](https://github.com/grafana/tempo/tree/main/example/docker-compose/single-binary)):

| Port | Purpose |
|---|---|
| 3200 | Tempo HTTP API + UI |
| 4317 | OTLP/gRPC ingest |
| 4318 | OTLP/HTTP ingest |

Tempo requires a minimal `tempo.yaml`. The configuration reference
([Tempo configuration](https://grafana.com/docs/tempo/latest/configuration/))
specifies these required sections for monolithic mode - Kafka is not needed
when `target: all`:

```yaml
# tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
```

Docker run (bind-mount the config):

```bash
docker run --rm --name tempo \
  -p 3200:3200 \
  -p 4317:4317 \
  -p 4318:4318 \
  -v "$PWD/tempo.yaml:/etc/tempo.yaml" \
  grafana/tempo:latest \
  -target=all -config.file=/etc/tempo.yaml
```

GitHub Actions service (docker-compose style):

```yaml
services:
  tempo:
    image: grafana/tempo:latest
    command: ["-target=all", "-config.file=/etc/tempo.yaml"]
    ports:
      - "3200:3200"
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
```

Wait for readiness before running tests. The `/ready` endpoint
([Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/))
returns HTTP 200 when Tempo is ready to serve traffic:

```bash
until curl -sf http://localhost:3200/ready; do sleep 1; done
```

## Step 2 - Configure the SDK to export to Tempo

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)
    )
)
trace.set_tracer_provider(provider)
```

Use `force_flush()` before querying - Step 4 covers the flush pattern.

## Step 3 - TraceQL query syntax

TraceQL span selectors use `{ }` braces. The simplest selector `{ }` matches
all spans. Conditions inside the braces filter spans
([Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)).

### Attribute scopes

| Prefix | Meaning | Example |
|---|---|---|
| `span.` | Span-scoped attribute | `span.http.status_code` |
| `resource.` | Resource attribute | `resource.service.name` |
| `span:` | Intrinsic span field | `span:status`, `span:duration`, `span:name`, `span:kind` |
| `trace:` | Trace-level intrinsic | `trace:duration`, `trace:rootService`, `trace:rootName` |

### Comparison operators

`=`, `!=`, `>`, `>=`, `<`, `<=`, `=~` (regex, fully anchored), `!~` (negated regex).

```
{ span.http.status_code >= 400 && span.http.status_code < 500 }
{ resource.service.name = "checkout" && span:status = error }
{ span.http.method =~ "GET|POST" }
{ span.any_attribute != nil }
{ trace:duration > 2s }
```

Logical connectives within a selector: `&&` (AND), `||` (OR).

### Structural operators

These assert on span relationships within a trace
([Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)):

| Operator | Meaning |
|---|---|
| `>>` | Descendant (any depth) |
| `>` | Direct child |
| `<<` | Ancestor |
| `~` | Sibling |

```
{ span.http.url = "/checkout" } >> { span.db.system = "postgresql" }
```

This selects traces where a checkout HTTP span has a PostgreSQL descendant span.

### Pipeline operators

Chain aggregations with `|`
([Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)):

```
{ span:status = error } | count() > 1
{ span:status = error } | by(resource.service.name) | count() > 1
{ resource.service.name = "api" } | avg(span:duration) > 500ms
{ span:status = error } | select(span.http.status_code, span.http.url)
```

## Step 4 - Query via `/api/search`

The `/api/search` endpoint accepts a `q` parameter containing a URL-encoded
TraceQL expression. Per the
[Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/):

| Parameter | Default | Notes |
|---|---|---|
| `q` | - | URL-encoded TraceQL query |
| `limit` | 20 | Maximum traces returned |
| `start` / `end` | - | Unix epoch seconds; scopes search to a time range |
| `spss` | 3 | Spans per span-set in the response |
| `minDuration` / `maxDuration` | - | Go duration format (e.g. `100ms`, `2s`) |

Response shape (abridged):

```json
{
  "traces": [
    {
      "traceID": "abc123",
      "rootServiceName": "checkout",
      "rootTraceName": "POST /order",
      "durationMs": 342,
      "spanSets": [
        {
          "spans": [
            {
              "spanID": "def456",
              "durationNanos": "45000000",
              "attributes": [
                { "key": "http.status_code", "value": { "intValue": "200" } }
              ]
            }
          ],
          "matched": 1
        }
      ]
    }
  ]
}
```

Force-flush + brief sleep before querying so `BatchSpanProcessor` ships all
pending spans:

```python
import time, requests
from urllib.parse import quote

def test_checkout_span_reaches_tempo():
    with tracer.start_as_current_span("POST /order"):
        place_order(items=["widget"])

    trace.get_tracer_provider().force_flush(timeout_millis=5000)
    time.sleep(0.5)  # Tempo ingest pipeline

    query = '{ resource.service.name = "checkout" && span.http.url = "/order" }'
    resp = requests.get(
        "http://localhost:3200/api/search",
        params={"q": query, "limit": 1},
    )
    resp.raise_for_status()
    traces = resp.json()["traces"]
    assert len(traces) == 1, f"Expected 1 trace, got {len(traces)}"
    assert traces[0]["rootServiceName"] == "checkout"
```

## Step 5 - Fetch a full trace by ID via `/api/traces/{id}`

`GET /api/traces/{traceID}` returns the full trace in OpenTelemetry JSON
format (proto spec at opentelemetry-proto)
([Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/)).
Optional `start`/`end` epoch-second params scope the backend search window.

```python
def test_db_span_is_child_of_checkout():
    with tracer.start_as_current_span("POST /order") as root:
        with tracer.start_as_current_span("db.query"):
            run_query("INSERT INTO orders ...")
        trace_id = format(root.get_span_context().trace_id, "032x")

    trace.get_tracer_provider().force_flush(timeout_millis=5000)
    time.sleep(0.5)

    resp = requests.get(f"http://localhost:3200/api/traces/{trace_id}")
    resp.raise_for_status()
    data = resp.json()

    resource_spans = data["resourceSpans"]
    all_spans = [
        s
        for rs in resource_spans
        for ss in rs["scopeSpans"]
        for s in ss["spans"]
    ]

    root_span = next(s for s in all_spans if s["name"] == "POST /order")
    db_span   = next(s for s in all_spans if s["name"] == "db.query")

    assert db_span["parentSpanId"] == root_span["spanId"]
```

## Step 6 - Assert span attributes

Attributes in the OTel JSON live in each span's `attributes` array as
`{ "key": "...", "value": { "<type>Value": ... } }` objects (OTel proto
format, per [Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/)).

```python
def attr(span, key):
    for a in span.get("attributes", []):
        if a["key"] == key:
            v = a["value"]
            return next(iter(v.values()))
    return None

assert attr(db_span, "db.system") == "postgresql"
assert int(attr(root_span, "http.status_code")) == 200
```

## Step 7 - Per-test isolation

CI runs many tests against one Tempo instance. Use a unique
`resource.service.name` per test run to scope `/api/search` queries:

```python
import uuid
service = f"checkout-test-{uuid.uuid4()}"
# ... configure TracerProvider with service.name = service ...
query = f'{{ resource.service.name = "{service}" }}'
```

Tempo local storage is in-memory-like; long test runs should restart the
container or use `start`/`end` time bounds in search calls.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Query `/api/search` before flush | `BatchSpanProcessor` defers export; spans not yet ingested | `force_flush()` + brief sleep (Step 4) |
| Omit `start`/`end` on long CI runs | Searches all backend blocks; slow and noisy | Pass epoch bounds scoped to the test window |
| Use production Tempo from CI | Test traces pollute real data; resource constraints | Always use Docker single-binary (Step 1) |
| Hard-code service name across tests | Cross-test contamination on shared instance | Unique `service.name` per test run (Step 7) |
| Assert span count from `/api/search` with default `spss=3` | `spss` caps spans per span-set; count is not total span count | Fetch full trace via `/api/traces/{id}` for complete span set |
| Use Grafana UI as the assertion surface | Scraping HTML is fragile; UI is for humans | Use `/api/search` and `/api/traces/{id}` in tests |

## Limitations

- Tempo local storage (`backend: local`) is suitable for CI but not
  production. The configuration reference recommends object storage for
  production workloads
  ([Tempo configuration](https://grafana.com/docs/tempo/latest/configuration/)).
- TraceQL requires the Parquet columnar block format, which is Tempo's
  default
  ([TraceQL overview](https://grafana.com/docs/tempo/latest/traceql/)).
  Legacy TSDB block format does not support TraceQL.
- `/api/search` returns at most `limit` traces (default 20) and `spss` spans
  per span-set (default 3). For complete span enumeration use
  `/api/traces/{id}`
  ([Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/)).
- Regex in TraceQL (`=~`) is fully anchored - partial matching requires
  wrapping: `=~ ".*substring.*"`
  ([Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)).

## References

- [Grafana Tempo getting started](https://grafana.com/docs/tempo/latest/getting-started/) - overview and deployment modes
- [TraceQL overview](https://grafana.com/docs/tempo/latest/traceql/) - language purpose and Parquet requirement
- [Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/) - selectors, operators, structural operators, pipelines
- [Tempo HTTP API docs](https://grafana.com/docs/tempo/latest/api_docs/) - `/api/search`, `/api/traces/{id}`, `/ready`, `/api/echo` endpoints
- [Tempo configuration reference](https://grafana.com/docs/tempo/latest/configuration/) - `server`, `distributor`, `storage` sections
- [Tempo docker-compose single-binary example](https://github.com/grafana/tempo/tree/main/example/docker-compose/single-binary) - image, ports, volume mounts
- `jaeger-trace-tests` - sister skill for Jaeger-using teams
- `zipkin-trace-tests` - sister skill for Zipkin-using teams
- `opentelemetry-trace-assertions` - in-process unit-level trace assertions
