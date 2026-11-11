---
description: Short prompt that should load experiment-sdk-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our unit tests call the real experimentation service and fail when it's slow. How do we run them offline?
