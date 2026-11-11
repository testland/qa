---
description: Short prompt that should load experiment-results-interpreter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Should we ship variant B? Control: 10,000 users, 412 conversions. Variant: 10,050 users, 455 conversions. We also looked at 12 secondary metrics and 2 of them are significant.
