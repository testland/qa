---
description: Should load test-code-conventions when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Review a Jest test file for test-code quality: naming, Arrange-Act-Assert structure, one behavior per test, and assertions that are too weak. Explain what to look for and how to fix each issue.
