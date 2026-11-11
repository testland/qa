---
description: Short prompt that should delegate to the regression-bisector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

`test_invoice_totals` passed on v3.1.0 and fails on main. Find the commit that broke it with git bisect.
