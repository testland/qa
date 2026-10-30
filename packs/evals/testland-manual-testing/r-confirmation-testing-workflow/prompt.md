---
description: Should load confirmation-testing-workflow when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A developer says the duplicate-charge bug is fixed in build 4.12. How should the tester confirm the fix is really in that build and actually works?
