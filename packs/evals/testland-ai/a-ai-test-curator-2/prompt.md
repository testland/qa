---
description: Short prompt that should delegate to the ai-test-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Copilot wrote 40 tests for our billing module. Check them for invented APIs and weak assertions before we merge.
