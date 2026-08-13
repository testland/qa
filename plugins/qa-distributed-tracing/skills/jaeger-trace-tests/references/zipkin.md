# Zipkin backend - same run-query-assert workflow

Zipkin is the original distributed-tracing system (predates
OpenTelemetry); still common in Java shops via Spring Cloud Sleuth
heritage, and these tests protect a Zipkin → Jaeger/OTel cutover. The
workflow is identical to Jaeger's: run the backend in CI, ship spans,
`force_flush()`, query the REST API, assert on the span set.

## Run in CI

Per the [Zipkin quickstart](https://zipkin.io/pages/quickstart.html):

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

```yaml
services:
  zipkin:
    image: openzipkin/zipkin
    ports: ["9411:9411"]
```

## REST API

Per the [Zipkin API spec](https://zipkin.io/zipkin-api/):

| Endpoint | Returns |
|---|---|
| `GET /api/v2/services` | Service names |
| `GET /api/v2/spans?serviceName=X` | Operations |
| `GET /api/v2/traces?serviceName=X&spanName=Y&lookback=300000&limit=10` | Traces (`lookback` in ms) |
| `GET /api/v2/trace/{traceId}` | Single trace |
| `GET /api/v2/dependencies?endTs=...&lookback=...` | Service dependency graph |
| `POST /api/v2/spans` | Submit spans (V2 JSON) |

## Ship + query + assert

```python
from opentelemetry.exporter.zipkin.json import ZipkinExporter
# BatchSpanProcessor(ZipkinExporter(endpoint="http://localhost:9411/api/v2/spans"))

def test_order_trace_in_zipkin():
    with use_tracer():
        create_order(items=[item])
    trace.get_tracer_provider().force_flush(timeout_millis=5000)
    time.sleep(0.5)

    traces = requests.get(
        "http://localhost:9411/api/v2/traces",
        params={"serviceName": "orders", "spanName": "order.create",
                "lookback": 60000, "limit": 1},
    ).json()                       # list of lists of spans
    assert len(traces) == 1
    span = next(s for s in traces[0] if s["name"] == "order.create")
    assert span["tags"]["order.item_count"] == "1"   # Zipkin V2 tags are ALL strings
```

Zipkin V2 stores tag values as strings (vs Jaeger's typed tags) - cast in
assertions accordingly.

## B3 propagation header tests

Per the [B3 propagation spec](https://github.com/openzipkin/b3-propagation):

- **Multi-header:** `X-B3-TraceId` (32/16 lower-hex), `X-B3-SpanId` (16),
  `X-B3-ParentSpanId` (absent on root), `X-B3-Sampled` (`1`/`0`),
  `X-B3-Flags` (`1` debug).
- **Single-header:** `b3: {TraceId}-{SpanId}-{SamplingState}-{ParentSpanId}`,
  sampling `1` accept / `0` deny / `d` debug / absent defer.

Test both forms - modern services increasingly send only the
single-header form:

```python
def test_b3_single_header_propagates():
    headers = {"b3": f"{trace_id}-{span_id}-1-{parent_id}"}
    requests.get("http://localhost:8080/orders", headers=headers)
    time.sleep(0.5)
    spans = requests.get(f"http://localhost:9411/api/v2/trace/{trace_id}").json()
    assert any(s["traceId"] == trace_id for s in spans)
```

## Dependency-graph assertion

Zipkin computes service dependencies from observed traces; aggregation is
**lazy** (in-memory computes inline; Cassandra uses Spark batch) - allow
>=2s:

```python
deps = requests.get("http://localhost:9411/api/v2/dependencies",
                    params={"endTs": int(time.time() * 1000), "lookback": 60000}).json()
pair = next((d for d in deps if d["parent"] == "orders" and d["child"] == "payments"), None)
assert pair and pair["callCount"] >= 1
```

## Zipkin-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assert tag values as integers | V2 tags are all strings | Compare as string |
| Test only multi-header B3 | Single-header form is common | Test both |
| Expect the dependency graph immediately | Aggregation is lazy | Allow ≥2s delay |

## References

- [Zipkin quickstart](https://zipkin.io/pages/quickstart.html)
- [Zipkin API spec](https://zipkin.io/zipkin-api/)
- [B3 propagation spec](https://github.com/openzipkin/b3-propagation)
