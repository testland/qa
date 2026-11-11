---
description: Short prompt that should delegate to the db-snapshot-restore agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Give our MySQL integration tests a clean database between test cases without re-running all migrations each time.
