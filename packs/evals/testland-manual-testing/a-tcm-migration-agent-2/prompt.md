---
description: Short prompt that should delegate to the tcm-migration-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Move all our test cases from Xray to Zephyr Scale.
