# qa-distributed-tracing

Sets the observability assertion testing pattern for the marketplace - assertions on production trace **shape** (spans, attributes, parent
links, status semantics), not just on aggregate metrics. Three SDK +
query skills (in-process, Jaeger, Zipkin), one spec-authoring skill,
and a reviewer agent that audits coverage + cardinality + spec
drift.

Pairs naturally with `qa-shift-right` (synthetic monitoring),
`qa-saga-cqrs` (saga trace shape), and `qa-resilience-drills`
(DR / runbook tracing).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [opentelemetry-trace-assertions](skills/opentelemetry-trace-assertions/SKILL.md) | In-process span capture via `InMemorySpanExporter` + `SimpleSpanProcessor` (Python), `getFinishedSpans()` (JS), `OpenTelemetryExtension` (Java); name + attribute + status + parent assertions; SemConv enforcement |
| Skill | [jaeger-trace-tests](skills/jaeger-trace-tests/SKILL.md) | Jaeger all-in-one Docker (OTLP gRPC :4317 / HTTP :4318 / UI+API :16686); `/api/traces` query + parent-via-`references`; per-test isolation via unique `service.name` |
| Skill | [zipkin-trace-tests](skills/zipkin-trace-tests/SKILL.md) | Zipkin Docker on :9411; REST API (`/api/v2/traces`, `/api/v2/dependencies`); B3 single-header + multi-header propagation tests |
| Skill | [trace-spec-author](skills/trace-spec-author/SKILL.md) | Build-an-X for trace specifications: per-feature span set + required SemConv attributes + status semantics + cardinality rules + assertion checklist |
| Agent | [trace-coverage-reviewer](agents/trace-coverage-reviewer.md) | Adversarial reviewer: untraced critical paths + missing SemConv attrs + deprecated keys + hand-rolled span code + cardinality risks + spec drift |
| Skill | [tempo-trace-tests](skills/tempo-trace-tests/SKILL.md) | Grafana Tempo trace testing via TraceQL queries and the Tempo HTTP API. |
| Skill | [otel-collector-config-tester](skills/otel-collector-config-tester/SKILL.md) | Validate an OpenTelemetry Collector pipeline config (receivers/processors/exporters) end to end. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-distributed-tracing@testland-qa
```
