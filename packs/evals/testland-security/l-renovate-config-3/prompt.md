---
description: Short prompt that should load renovate-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Renovate opened 60 PRs on its first day and we turned it off. How do we configure it sensibly?
