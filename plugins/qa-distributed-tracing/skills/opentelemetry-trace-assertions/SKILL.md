---
name: opentelemetry-trace-assertions
description: "Use when a service is instrumented with OpenTelemetry and alerts, SLOs or dashboards depend on span names or attributes a refactor could drop. Captures spans with the in-memory exporter in tests (Python, JS, Java) and asserts on names, attributes, status, kind and structure."
metadata:
  keywords: "opentelemetry, distributed-tracing, span-assertions, in-memory-exporter, observability-testing"
  version: "1.1.12"
---

# opentelemetry-trace-assertions

## Overview

Tests capture the spans the code under test emits with an in-memory
exporter, then assert the contract that alerts, SLOs and dashboards
read: span names, attribute keys and values, status, kind, and which
span is whose parent. A refactor that drops any of these stays green in
ordinary tests and silently empties a panel or stops an alert.

## When to use

- Alerts, SLO queries or dashboards select on span names or attributes.
- A trace-shape change has already caused a missed page or an empty panel.
- New instrumentation needs a regression baseline.

## Step 1 - Install the SDK test pieces

| Language | Install |
|---|---|
| Python | `pip install opentelemetry-sdk` |
| JS / TS | `npm install -D @opentelemetry/sdk-trace-base @opentelemetry/sdk-trace-node @opentelemetry/api` |
| Java | `io.opentelemetry:opentelemetry-sdk-testing` (test scope) |
| .NET | `dotnet add package OpenTelemetry.Exporter.InMemory` |

## Step 2 - Wire a synchronous in-memory exporter

`SimpleSpanProcessor` passes each span to the exporter as it ends; the
batching processor exports on a timer, so a read right after the
exercise misses spans and tests start sleeping
([Python SDK export docs][py-export]).

```python
# tests/conftest.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

_exporter = InMemorySpanExporter()
_provider = TracerProvider()
_provider.add_span_processor(SimpleSpanProcessor(_exporter))
trace.set_tracer_provider(_provider)        # once per process

@pytest.fixture
def spans():
    _exporter.clear()                        # each test sees only its own spans
    def by_name(name):
        found = [s for s in _exporter.get_finished_spans() if s.name == name]
        assert found, f"no finished span named {name!r}"
        return found[-1]
    yield by_name
    _exporter.clear()
```

Reach spans through `by_name`, never by index or by counting them:
instrumentation order and extra spans change without the contract
changing, and an empty buffer makes loops over spans pass vacuously.

## Step 3 - Assert name, attributes, status and kind

```python
from opentelemetry.trace import SpanKind, StatusCode

def test_order_create_span(spans):
    create_order(items=[item])

    order = spans("order.create")
    assert order.attributes["order.item_count"] == 1
    assert order.status.status_code != StatusCode.ERROR
    assert order.kind == SpanKind.INTERNAL

def test_rates_provider_down_is_an_error(spans, provider_down):
    price = convert(100, "EUR")              # falls back to the cached rate
    assert price == 8600                     # the conversion still succeeds

    fetch = spans("rates.fetch")
    assert fetch.kind == SpanKind.CLIENT     # an outgoing call, not in-process
    assert fetch.status.status_code == StatusCode.ERROR
    assert fetch.attributes["error.type"] == "ConnectionRefusedError"
    assert spans("pricing.convert").status.status_code != StatusCode.ERROR
```

Status rules for HTTP spans: leave status unset on 1xx-3xx and on
server-side 4xx; set `Error` on client-side 4xx and on 5xx
([HTTP semantic conventions][semconv-http]). `error.type` is required
when the call ended in an error. Only the failing span gets the error
status; a caller that recovered keeps a successful one.

## Step 4 - Assert parent-child structure

IDs are random per run, so compare IDs read from the same run, never
literal values:

```python
def test_db_span_is_child_of_order(spans):
    create_order(items=[item])
    order, db = spans("order.create"), spans("db.query")

    assert db.context.trace_id == order.context.trace_id
    assert db.parent is not None, "db.query started a new trace"
    assert db.parent.span_id == order.context.span_id
```

For context sent to another service, parse the outgoing `traceparent`
header the fake client captured (`00-<trace_id>-<span_id>-<flags>`)
and compare its trace and span IDs with the CLIENT span's own
`context.trace_id` / `context.span_id` formatted as 32 and 16 hex
digits ([W3C Trace Context][w3c]). A span for another service's work
(inventory, a worker) cannot be proved here; do not create one in the
test and assert on it.

## Step 5 - Semantic-convention keys

HTTP client spans require `http.request.method`, `url.full`,
`server.address` and `server.port`; `http.response.status_code` is
required when a status was received and `error.type` when the call
failed. The span name is `{method}`, or `{method} {target}` when a
low-cardinality target is known ([HTTP semantic conventions][semconv-http]):

```python
def test_charge_call_attributes(spans):
    charge_card(order)
    http = spans("POST")                     # "{method}" or "{method} {url.template}"
    assert http.kind == SpanKind.CLIENT
    assert http.attributes["http.request.method"] == "POST"
    assert http.attributes["url.full"].startswith("https://gateway.example.com/charges")
    assert http.attributes["server.address"] == "gateway.example.com"
    assert http.attributes["http.response.status_code"] == 201
```

Older instrumentation emits the experimental keys (`http.method`,
`http.status_code`). `OTEL_SEMCONV_STABILITY_OPT_IN=http` switches to
the stable keys and `http/dup` emits both during a migration
([HTTP semantic conventions][semconv-http]). Before switching, find
every alert and dashboard that selects on the old keys: they stop
matching the day the change ships.

## Step 6 - JS / TS

JS SDK 2.x removed `addSpanProcessor()`; pass processors to the
provider constructor ([upgrade guide][js-2x]).

```ts
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

const exporter = new InMemorySpanExporter();
new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }).register();

const byName = (name: string) => {
  const span = exporter.getFinishedSpans().findLast((s) => s.name === name);
  if (!span) throw new Error(`no finished span named ${name}`);
  return span;
};

beforeEach(() => exporter.reset());

test('rates.fetch records the outage', async () => {
  await convert(100, 'EUR');
  const fetch = byName('rates.fetch');
  expect(fetch.kind).toBe(SpanKind.CLIENT);
  expect(fetch.status.code).toBe(SpanStatusCode.ERROR);
  expect(fetch.attributes['error.type']).toBe('ECONNREFUSED');
});
```

## Step 7 - Java (JUnit 5)

```java
@RegisterExtension
static final OpenTelemetryExtension otel = OpenTelemetryExtension.create();

@Test
void orderCreateEmitsSpan() {
    new OrderService(otel.getOpenTelemetry()).create(order);

    SpanData span = otel.getSpans().stream()
        .filter(s -> s.getName().equals("order.create"))
        .findFirst().orElseThrow();
    assertThat(span.getAttributes().get(AttributeKey.longKey("order.item_count"))).isEqualTo(1L);
}
```

The extension resets captured spans before each test; inject its
`OpenTelemetry` into the code under test ([Java SDK testing][java-test]).

## Step 8 - CI

Pin the SDK and instrumentation versions so attribute keys do not
change between runs, and run trace tests in the normal test job: with
the synchronous processor they add milliseconds, not a separate slow
job.

```yaml
- run: pip install -r requirements-test.txt   # opentelemetry-sdk pinned there
- run: pytest tests -v
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `BatchSpanProcessor` in tests | Spans missing at read time; tests sleep | `SimpleSpanProcessor` (Step 2) |
| No reset between tests | One test reads another's spans | Clear in the fixture (Step 2) |
| `spans[0]`, `len(spans) == 3` | Breaks on harmless changes; hides missing spans | Look up by name (Step 2) |
| Asserts inside `for s in spans:` | Passes when nothing was captured | Resolve the span unconditionally |
| Literal trace / span IDs | Random per run | Compare IDs from the same run (Step 4) |
| Remote call left as `INTERNAL` | Rules selecting `CLIENT` / `PRODUCER` miss it | Assert kind (Step 3) |
| Catch-and-fallback leaves the failing span unset | Availability SLO counts the outage as success | Error status + `error.type` on that span (Step 3) |
| Editing the alert or dashboard to match what the code emits | Hides the regression | Fix the instrumentation |

## Limitations

- In-process only: it cannot prove spans emitted by another service.
  Use `jaeger-trace-tests` against a real backend for cross-service
  traces.
- Span links and events are not covered by these patterns.
- Instrumentation library upgrades can change keys; pin versions and
  re-run on upgrade.

## References

- [OpenTelemetry Python SDK export][py-export] - `SimpleSpanProcessor`, `BatchSpanProcessor`, `InMemorySpanExporter`.
- [HTTP semantic conventions][semconv-http] - required attributes, span status rules, `OTEL_SEMCONV_STABILITY_OPT_IN`.
- [OpenTelemetry JS upgrade to 2.x][js-2x] - `addSpanProcessor` removed; constructor `spanProcessors`.
- [Java SDK testing][java-test] - `OpenTelemetryExtension`.
- [W3C Trace Context][w3c] - `traceparent` format.
- [OpenTelemetry traces concepts][otel-traces] - spans, kinds, status, links.
- Sibling skill: `jaeger-trace-tests` (query-based end-to-end trace checks; Zipkin and Tempo in its references).

[py-export]: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
[semconv-http]: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
[js-2x]: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
[java-test]: https://github.com/open-telemetry/opentelemetry-java/tree/main/sdk/testing
[w3c]: https://www.w3.org/TR/trace-context/
[otel-traces]: https://opentelemetry.io/docs/concepts/signals/traces/
