---
description: Short prompt that should delegate to the contract-drift-investigator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

The OpenAPI spec and the provider disagree since yesterday's deploy. Investigate the contract drift.
