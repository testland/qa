---
description: Should load tcm-case-management when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Import 300 test cases from a CSV export into TestRail, organised into suites by feature, with steps and expected results.
