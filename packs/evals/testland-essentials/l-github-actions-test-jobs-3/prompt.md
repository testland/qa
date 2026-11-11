---
description: Short prompt that should load github-actions-test-jobs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our GitHub Actions test job takes 40 minutes. How do we split it across runners?
