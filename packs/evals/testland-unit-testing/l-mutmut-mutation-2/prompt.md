---
description: Short prompt that should load mutmut-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set up mutmut for our pytest suite and run it on the billing module only.
