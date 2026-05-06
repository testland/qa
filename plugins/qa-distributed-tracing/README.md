# qa-distributed-tracing

Sets the observability assertion testing pattern for the marketplace
— assertions on production trace **shape** (spans, attributes, parent
links, status semantics), not just on aggregate metrics. Three SDK +
query skills (in-process, Jaeger, Zipkin), one spec-authoring skill,
and an A3 reviewer agent that audits coverage + cardinality + spec
drift.

**First Phase 7 plugin per v2 master plan §8.** Pairs naturally with
the `qa-shift-right` (synthetic monitoring), `qa-saga-cqrs` (saga
trace shape), and `qa-resilience-drills` (DR / runbook tracing)
plugins.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [opentelemetry-trace-assertions](skills/opentelemetry-trace-assertions/SKILL.md) | S1 | In-process span capture via `InMemorySpanExporter` + `SimpleSpanProcessor` (Python), `getFinishedSpans()` (JS), `OpenTelemetryExtension` (Java); name + attribute + status + parent assertions; SemConv enforcement |
| Skill | [jaeger-trace-tests](skills/jaeger-trace-tests/SKILL.md) | S1 | Jaeger all-in-one Docker (OTLP gRPC :4317 / HTTP :4318 / UI+API :16686); `/api/traces` query + parent-via-`references`; per-test isolation via unique `service.name` |
| Skill | [zipkin-trace-tests](skills/zipkin-trace-tests/SKILL.md) | S1 | Zipkin Docker on :9411; REST API (`/api/v2/traces`, `/api/v2/dependencies`); B3 single-header + multi-header propagation tests |
| Skill | [trace-spec-author](skills/trace-spec-author/SKILL.md) | S3 | Build-an-X for trace specifications: per-feature span set + required SemConv attributes + status semantics + cardinality rules + assertion checklist |
| Agent | [trace-coverage-reviewer](agents/trace-coverage-reviewer.md) | A3 | Adversarial reviewer: untraced critical paths + missing SemConv attrs + deprecated keys + hand-rolled span code + cardinality risks + spec drift |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-distributed-tracing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components**. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
