---
description: Short prompt that should load gherkin-from-stories with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write acceptance scenarios for this: users can export their invoices as CSV or PDF, only for the last 12 months.
