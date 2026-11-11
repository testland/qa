---
description: Short prompt that should delegate to the quality-coach agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check this PR against our Definition of Done and tell me which lines are met.

DoD: 1) code reviewed by one person, 2) unit tests for new logic, 3) docs updated for user-facing changes, 4) feature flag defaults off.
PR #812 'Add CSV export': 1 approval, export.py +120 lines, test_export.py +40 lines, no docs change, flag `csv_export` default true.
