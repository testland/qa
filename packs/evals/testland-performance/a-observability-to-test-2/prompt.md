---
description: Short prompt that should delegate to the observability-to-test agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our synthetic checkout monitor failed three times last night. Write the test that would have caught it before release.
