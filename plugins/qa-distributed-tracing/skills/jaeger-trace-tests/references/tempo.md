# Grafana Tempo backend - TraceQL queries, same workflow

Grafana Tempo ("an open source and high-scale distributed tracing
backend", per
[Tempo getting started](https://grafana.com/docs/tempo/latest/getting-started/))
follows the same run-query-assert workflow, with two differences: queries
use **TraceQL**, and structural operators give parent-child / descendant
assertions Jaeger's flat span-list API does not expose natively.

## Run single-binary in CI

Ports: 3200 (HTTP API + UI), 4317/4318 (OTLP ingest). Tempo needs a
minimal `tempo.yaml` (per the
[configuration reference](https://grafana.com/docs/tempo/latest/configuration/),
monolithic `target: all`):

```yaml
# tempo.yaml
server:
  http_listen_port: 3200
distributor:
  receivers:
    otlp:
      protocols:
        grpc: { endpoint: 0.0.0.0:4317 }
        http: { endpoint: 0.0.0.0:4318 }
storage:
  trace:
    backend: local
    local: { path: /var/tempo/traces }
```

```bash
docker run --rm --name tempo -p 3200:3200 -p 4317:4317 -p 4318:4318 \
  -v "$PWD/tempo.yaml:/etc/tempo.yaml" \
  grafana/tempo:latest -target=all -config.file=/etc/tempo.yaml

until curl -sf http://localhost:3200/ready; do sleep 1; done   # readiness gate
```

The SDK exporter config is identical to Jaeger's (OTLP to `:4317`).

## TraceQL essentials

Per [Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/),
span selectors use `{ }`:

| Prefix | Meaning | Example |
|---|---|---|
| `span.` | Span attribute | `span.http.status_code` |
| `resource.` | Resource attribute | `resource.service.name` |
| `span:` | Intrinsic span field | `span:status`, `span:duration`, `span:name`, `span:kind` |
| `trace:` | Trace intrinsic | `trace:duration`, `trace:rootService`, `trace:rootName` |

Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `=~` (regex, **fully
anchored** - wrap with `.*` for partial match), `!~`; connectives `&&`,
`||`.

Structural operators assert span relationships:
`>>` descendant, `>` direct child, `<<` ancestor, `~` sibling:

```
{ span.http.url = "/checkout" } >> { span.db.system = "postgresql" }
```

Pipelines aggregate: `{ span:status = error } | count() > 1`,
`{ resource.service.name = "api" } | avg(span:duration) > 500ms`.

## Query via /api/search

Per the [Tempo API docs](https://grafana.com/docs/tempo/latest/api_docs/),
`/api/search` takes `q` (URL-encoded TraceQL), `limit` (default 20),
`start`/`end` (epoch seconds), `spss` (spans per span-set, default 3),
`minDuration`/`maxDuration`.

```python
def test_checkout_span_reaches_tempo():
    with tracer.start_as_current_span("POST /order"):
        place_order(items=["widget"])
    trace.get_tracer_provider().force_flush(timeout_millis=5000)
    time.sleep(0.5)

    query = '{ resource.service.name = "checkout" && span.http.url = "/order" }'
    traces = requests.get("http://localhost:3200/api/search",
                          params={"q": query, "limit": 1}).json()["traces"]
    assert len(traces) == 1
    assert traces[0]["rootServiceName"] == "checkout"
```

## Full trace by ID - parent-child assertions

`GET /api/traces/{traceID}` returns OpenTelemetry JSON; walk
`resourceSpans[].scopeSpans[].spans[]` and assert
`db_span["parentSpanId"] == root_span["spanId"]`. Attributes are
`{ "key": ..., "value": { "<type>Value": ... } }` objects (OTel proto
format).

## Tempo-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Omit `start`/`end` on long CI runs | Searches all backend blocks; slow | Epoch bounds scoped to the test window |
| Span counts from `/api/search` with default `spss=3` | `spss` caps spans per span-set | Fetch the full trace via `/api/traces/{id}` |
| Partial-match `=~` without wrapping | TraceQL regex is fully anchored | `=~ ".*substring.*"` |
| Grafana UI as the assertion surface | HTML scraping is fragile | `/api/search` + `/api/traces/{id}` |

## Limitations

- `backend: local` suits CI, not production (object storage recommended
  per the configuration reference).
- TraceQL requires the Parquet block format (Tempo's default); legacy
  TSDB blocks don't support it.

## References

- [Tempo getting started](https://grafana.com/docs/tempo/latest/getting-started/)
- [TraceQL overview](https://grafana.com/docs/tempo/latest/traceql/)
- [Construct a TraceQL query](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)
- [Tempo HTTP API docs](https://grafana.com/docs/tempo/latest/api_docs/)
- [Tempo configuration reference](https://grafana.com/docs/tempo/latest/configuration/)
- [Single-binary docker-compose example](https://github.com/grafana/tempo/tree/main/example/docker-compose/single-binary)
