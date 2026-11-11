---
description: Short prompt that should load otel-collector-config-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Check this collector config and write a CI test that spans flow through it.

```yaml
receivers: { otlp: { protocols: { grpc: {} } } }
processors: { batch: {} }
exporters: { otlphttp: { endpoint: https://otel.vendor.io } }
service: { pipelines: { traces: { receivers: [otlp], exporters: [otlphttp] } } }
```
