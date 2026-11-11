---
description: Short prompt that should load evidently-monitoring with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our fraud model's precision dropped slowly over three months and nobody noticed. How do we monitor for that?
