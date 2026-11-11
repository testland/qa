---
description: Short prompt that should delegate to the release-readiness-checker agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Are we ready to release? Smoke passed, coverage 81% (gate 80%), 1 open critical bug (PAY-221), migration dry-run passed, CDN warm-up not run.
