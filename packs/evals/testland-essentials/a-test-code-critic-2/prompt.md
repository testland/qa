---
description: Short prompt that should delegate to the test-code-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review the test files in this PR for convention problems before I approve it.
