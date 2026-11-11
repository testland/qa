---
description: Short prompt that should delegate to the release-engineer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Walk through tonight's release of the payments service step by step: pre-flight checks, smoke gate, canary, promote, verify.
