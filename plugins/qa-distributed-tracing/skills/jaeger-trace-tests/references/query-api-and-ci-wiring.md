# Jaeger query API, advanced assertions, and CI wiring

Deep reference for the `jaeger-trace-tests` SKILL.md. Consult for the full
Jaeger query API surface, parent-child + duration assertion patterns, the
GitHub Actions service block, and per-test isolation / retention on a shared
CI backend.

## Query API endpoints

Jaeger exposes trace data over an HTTP query API on `:16686`:

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

`duration` is in microseconds; `tags` is a flat list of typed key/value
pairs; parent links live in `references`, not on the child span directly.

## Parent-child assertions via `references`

Jaeger encodes parent links as `references` with `refType: "CHILD_OF"`.

```python
def parent_id(span):
    refs = span.get("references", [])
    child_of = [r for r in refs if r["refType"] == "CHILD_OF"]
    return child_of[0]["spanID"] if child_of else None

assert parent_id(db_span) == order_span["spanID"]
```

Assert a duration ceiling straight off the microsecond `duration` field:

```python
assert order_span["duration"] < 500_000  # under 500ms
```

## GitHub Actions service

Run the all-in-one image as a job service so every step can reach OTLP
ingest and the query API:

```yaml
services:
  jaeger:
    image: cr.jaegertracing.io/jaegertracing/jaeger:2.17.0
    ports:
      - 16686:16686
      - 4317:4317
      - 4318:4318
```

Full port map: `16686` query API + UI, `4317` OTLP/gRPC ingest, `4318`
OTLP/HTTP ingest, `5778` sampling config, `9411` Zipkin (B3) compatibility.

## Per-test isolation on shared CI

CI runs many tests against one Jaeger. Scope each test with a unique
`service.name` (or a unique trace tag) so a query never sees another
test's spans:

```python
service_name = f"orders-test-{uuid4()}"
# configure the SDK with this service name, then query filtered by it
```

In-memory storage is bounded by Jaeger's eviction; long test runs should
restart the container or accept eviction.

## Retention

All-in-one uses transient in-memory storage per the [Jaeger getting-started
docs]. For longer runs mount a config or restart the container between
workflows:

```bash
docker run ... \
  -v /path/to/config.yaml:/jaeger/config.yaml \
  cr.jaegertracing.io/jaegertracing/jaeger:2.17.0 \
  --config /jaeger/config.yaml
```

Production storage backends (Cassandra, Elasticsearch, OpenSearch, Badger)
matter for real deployments; the in-memory all-in-one is sufficient for CI.

[Jaeger getting-started docs]: https://www.jaegertracing.io/docs/latest/getting-started/
