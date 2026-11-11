---
description: Short prompt that should delegate to the contract-drift-investigator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our Pact verification went red overnight. Diff the current contracts against the last green baseline and tell me what drifted and who changed it.
