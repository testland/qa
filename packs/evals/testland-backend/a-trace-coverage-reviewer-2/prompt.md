---
description: Short prompt that should delegate to the trace-coverage-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check this PR's tracing: which spans are missing required semantic-convention attributes?
