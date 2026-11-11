---
description: Short prompt that should delegate to the property-based-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author a Hypothesis property test for our `encode`/`decode` round trip.
