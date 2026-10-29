---
description: Should load boundary-value-generator when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The signup form accepts ages 13 to 120 and a username of 3 to 20 characters. Generate the boundary test values for both fields.
