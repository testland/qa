---
description: Should load junit-xml-analysis when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

CI produced 14 JUnit XML files under reports/. Tell me which tests failed, which are slowest, and whether any failures look like the same root cause.
