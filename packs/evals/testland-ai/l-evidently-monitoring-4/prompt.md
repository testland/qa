---
description: Held-out short prompt that should load evidently-monitoring with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

Which metrics tell me that the input data for my model has changed in production?
