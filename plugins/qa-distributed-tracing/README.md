# qa-distributed-tracing

Sets the observability assertion testing pattern for the marketplace - assertions on production trace **shape** (spans, attributes, parent
links, status semantics), not just on aggregate metrics. An in-process
assertion skill, one backend query skill (Jaeger, with Zipkin + Tempo in
its references), a collector-config tester, a spec-authoring skill,
and a reviewer agent that audits coverage + cardinality + spec
drift.

Pairs naturally with `qa-shift-right` (synthetic monitoring),
`qa-saga-cqrs` (saga trace shape), and `qa-resilience-drills`
(DR / runbook tracing).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [opentelemetry-trace-assertions](skills/opentelemetry-trace-assertions/SKILL.md) | In-process span capture via `InMemorySpanExporter` + `SimpleSpanProcessor` (Python), `getFinishedSpans()` (JS), `OpenTelemetryExtension` (Java); name + attribute + status + parent assertions; SemConv enforcement |
| Skill | [jaeger-trace-tests](skills/jaeger-trace-tests/SKILL.md) | Backend query tests for Jaeger (all-in-one Docker, OTLP :4317/:4318, `/api/traces` on :16686), Zipkin (references/zipkin.md: :9411 REST API, B3 propagation), and Tempo (references/tempo.md: TraceQL, `/api/search`) |
| Skill | [trace-spec-author](skills/trace-spec-author/SKILL.md) | Build-an-X for trace specifications: per-feature span set + required SemConv attributes + status semantics + cardinality rules + assertion checklist |
| Agent | [trace-coverage-reviewer](agents/trace-coverage-reviewer.md) | Adversarial reviewer: untraced critical paths + missing SemConv attrs + deprecated keys + hand-rolled span code + cardinality risks + spec drift |
| Skill | [otel-collector-config-tester](skills/otel-collector-config-tester/SKILL.md) | Validate an OpenTelemetry Collector pipeline config (receivers/processors/exporters) end to end. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-distributed-tracing@testland-qa
```
