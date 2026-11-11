---
description: Short prompt that should load ghz-load with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our gRPC p99 latency doubled after a release and nobody noticed. How do we add a latency gate to CI?
