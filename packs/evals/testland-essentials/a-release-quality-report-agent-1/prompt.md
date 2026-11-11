---
description: Short prompt that should delegate to the release-quality-report-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write the release-quality go/no-go report for v5.2 for our head of engineering: 1,240 passed, 18 failed (12 payments), coverage down 2% in refunds.py, 3 high-risk files uncovered.
