---
description: Short prompt that should delegate to the vacuous-property-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review our fast-check properties for preconditions that throw away most inputs and properties that always pass.
