---
description: Short prompt that should delegate to the e2e-flake-bisector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Find out what makes our flaky login E2E test fail: worker count, test order, viewport or network speed.
