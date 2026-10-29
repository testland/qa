---
description: Should load github-actions-test-jobs when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up a GitHub Actions workflow that runs our pytest suite on every PR, splits it across 4 runners, and uploads the JUnit report.
