---
description: Short prompt that should load coverage-diff-reporter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our total coverage stays at 80% but a module we care about lost a lot of tests and nobody noticed. How do we catch that in PRs?
