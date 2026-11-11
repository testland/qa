---
description: Short prompt that should load github-actions-test-jobs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I run tests in GitHub Actions on every pull request?
