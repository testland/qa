---
description: Short prompt that should load secrets-rotation-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We deleted a leaked token from our git history with filter-repo. Are we safe now?
