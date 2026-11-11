---
description: Short prompt that should delegate to the tcm-migration-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Migrate our 4,000 test cases from TestRail to Qase, keeping steps, attachments and requirement links.
