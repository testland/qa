---
description: Short prompt that should load spec-testability-heuristics with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which of these acceptance criteria can't be tested, and how should they be rewritten?

- The dashboard loads quickly.
- Users can export reports.
- The system handles errors gracefully.
- Search returns results within 300 ms at p95 for 1,000 concurrent users.
