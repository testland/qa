---
description: Short prompt that should delegate to the test-case-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit these test cases for quality.

| ID | Title | Precondition | Steps | Expected |
|---|---|---|---|---|
| TC1 | Login | - | Log in | OK |
| TC2 | Export | User exists | Click export, open file, check columns, check totals | File correct |
