---
name: opentelemetry-trace-assertions
description: "Author trace-shape assertions in tests using OpenTelemetry SDK in-memory exporter - capture spans during test execution, assert on span name + attributes + status + parent-child structure + duration. Cross-language patterns (Python `InMemorySpanExporter` + `SimpleSpanProcessor`, JS `getRecordedSpans()`, Java `OpenTelemetryExtension`); CI integration. Use when a service is instrumented with the OpenTelemetry SDK and downstream alerts, SLOs, or dashboards depend on specific span names or attributes that a refactor could silently drop."
metadata:
  keywords: "opentelemetry, distributed-tracing, span-assertions, in-memory-exporter, observability-testing"
---

# opentelemetry-trace-assertions

Per the [OpenTelemetry traces concept docs], a trace is *"the path of a
request through your application"* and a span is *"a unit of work or
operation"*. Spans form a directed acyclic graph (DAG) via parent-child
relationships, all sharing the same `trace_id`.

## When to use

- Service is instrumented with OpenTelemetry SDK and the team's
  observability stack (alerts, SLOs) depends on specific span
  attributes - silent removal of an attribute breaks downstream
  alerting.
- Trace-shape changes have caused production incidents.
- Onboarding new instrumentation needs a regression baseline.

## Step 1 - Install (per language)

| Language | Install |
|---|---|
| Python | `pip install opentelemetry-sdk` |
| JS/TS | `npm install @opentelemetry/sdk-trace-base @opentelemetry/sdk-trace-node` |
| Java (Maven) | `<dependency><groupId>io.opentelemetry</groupId><artifactId>opentelemetry-sdk-testing</artifactId></dependency>` |
| .NET | `dotnet add package OpenTelemetry --prerelease` + `OpenTelemetry.Exporter.InMemory` |

## Step 2 - In-memory exporter setup (Python)

Per the [Python SDK trace docs], use `SimpleSpanProcessor` for tests
because it *"passes ended spans directly to the configured SpanExporter"*
synchronously - no batching, no flush wait:

```python
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry import trace

memory_exporter = InMemorySpanExporter()
tracer_provider = TracerProvider()
tracer_provider.add_span_processor(SimpleSpanProcessor(memory_exporter))
trace.set_tracer_provider(tracer_provider)

# ... exercise code under test ...

spans = memory_exporter.get_finished_spans()
assert len(spans) == 3
memory_exporter.clear()
```

The `clear()` call between tests prevents cross-test span leakage.

## Step 3 - Span shape assertions

Per the [OpenTelemetry traces concept docs], spans expose `name`,
`attributes`, `status`, and `kind`:

```python
def test_order_creation_emits_correct_trace():
    with use_tracer():
        create_order(items=[item])

    spans = memory_exporter.get_finished_spans()
    span_by_name = {s.name: s for s in spans}

    assert "order.create" in span_by_name
    order_span = span_by_name["order.create"]
    assert order_span.attributes.get("order.item_count") == 1
    assert order_span.status.status_code == StatusCode.OK
    assert order_span.kind == SpanKind.INTERNAL
```

Per the [OpenTelemetry traces concept docs]: span kind values are
`INTERNAL` (in-process), `CLIENT` (outgoing remote), `SERVER`
(incoming remote), `PRODUCER` (queue publish), `CONSUMER` (queue
process).

## Step 4 - Parent-child structure

Per the [OpenTelemetry traces concept docs], spans share a `trace_id`
and reference their parent via `parent_id`. Assert structure (not
values - IDs are random per run):

```python
db_span = span_by_name["db.query"]
order_span = span_by_name["order.create"]

# Same trace
assert db_span.context.trace_id == order_span.context.trace_id

# DB is a child of order.create
assert db_span.parent.span_id == order_span.context.span_id
```

## Step 5 - Semantic conventions verification

Per the [HTTP semantic conventions docs], required HTTP client span
attributes include `http.request.method`, `url.full`, `server.address`,
`server.port`, `http.response.status_code`, and `error.type`:

```python
assert http_span.attributes["http.request.method"] == "POST"
assert http_span.attributes["url.full"].startswith("https://api.example.com/orders")
assert http_span.attributes["http.response.status_code"] == 201
```

**Deprecation note:** older SDKs emitted `http.method` (deprecated).
Per the [HTTP semantic conventions docs], the current key is
`http.request.method`. The `OTEL_SEMCONV_STABILITY_OPT_IN` env var
controls dual-emit during migration. Tests should assert the new
keys; failures during SDK upgrade are the signal that instrumentation
needs migrating, not that the test is wrong.

## Step 6 - JS / TS pattern

```ts
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const memoryExporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
provider.register();

// ... exercise ...

const spans = memoryExporter.getFinishedSpans();
expect(spans).toHaveLength(3);
memoryExporter.reset();
```

## Step 7 - Java JUnit 5 pattern

```java
@RegisterExtension
static final OpenTelemetryExtension otelTesting = OpenTelemetryExtension.create();

@Test
void orderCreateEmitsTrace() {
    createOrder(/* ... */);

    List<SpanData> spans = otelTesting.getSpans();
    assertThat(spans).extracting(SpanData::getName).contains("order.create");
}
```

`OpenTelemetryExtension` (from `opentelemetry-sdk-testing`) auto-resets
between tests; no manual `clear()` needed.

## Step 8 - CI integration

Pin the SDK version in test deps. SDK upgrades change attribute keys
(see Step 5 deprecation note); pinning prevents trace assertions from
silently changing meaning between releases.

```yaml
# pytest in CI
- run: |
    pip install opentelemetry-sdk==1.29.0
    pytest tests/trace/ -v
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Asserting on exact span IDs | IDs are random per run | Assert structure (parent.span_id == X.context.span_id), not values (Step 4) |
| Asserting span count without name lookup | Brittle to instrumentation reorder | Build `span_by_name` dict (Step 3) |
| Use `BatchSpanProcessor` for tests | Async batching → flaky `get_finished_spans()` | Always `SimpleSpanProcessor` for tests (Step 2) |
| Skip `memory_exporter.clear()` between tests | Cross-test span leakage; flake | `clear()` in fixture teardown (Step 2) |
| Assert on legacy `http.method` keys | Breaks on SDK upgrade to v1.20+ | Use `http.request.method` (Step 5) |

## Limitations

- In-memory exporter doesn't catch async-boundary issues across
  process boundaries - pair with `jaeger-trace-tests` /
  `zipkin-trace-tests` for end-to-end trace verification.
- SDK-version drift can change span attribute names; pin SDK version
  in CI (Step 8).
- Span links (per the [OpenTelemetry traces concept docs]) are not
  asserted in this skill's pattern; extend per use case.

## References

- [OpenTelemetry traces concept docs] - trace + span definitions,
  DAG structure, span kind, status, attributes, links
- [Python SDK trace docs] - SimpleSpanProcessor vs BatchSpanProcessor
- [HTTP semantic conventions docs] - required attributes, span name
  format, deprecation history
- [`jaeger-trace-tests`](../jaeger-trace-tests/SKILL.md),
  [`zipkin-trace-tests`](../zipkin-trace-tests/SKILL.md) - sister
  query-based skills for end-to-end verification

[OpenTelemetry traces concept docs]: https://opentelemetry.io/docs/concepts/signals/traces/
[Python SDK trace docs]: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
[HTTP semantic conventions docs]: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
