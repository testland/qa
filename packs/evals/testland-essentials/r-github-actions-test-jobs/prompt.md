---
description: Should load github-actions-test-jobs when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a GitHub Actions workflow that runs a Node.js test suite on every pull request against Node 20 and 22, with a Postgres service container, and uploads the JUnit report.
