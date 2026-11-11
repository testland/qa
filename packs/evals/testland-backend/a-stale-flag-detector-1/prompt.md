---
description: Short prompt that should delegate to the stale-flag-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Find stale feature flags in our codebase: flags at 100% for months, old kill switches and flags no longer in LaunchDarkly.
