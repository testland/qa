---
description: Short prompt that should load confirmation-testing-workflow with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We closed a bug as fixed, then it reappeared in production because the fix never made it into the release build. How do we prevent that?
