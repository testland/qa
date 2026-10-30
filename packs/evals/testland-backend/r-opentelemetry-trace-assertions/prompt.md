---
description: Should load opentelemetry-trace-assertions when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a test for a Python service instrumented with OpenTelemetry that asserts the checkout request produces a span named `checkout.process` with the `order.id` attribute and an OK status.
