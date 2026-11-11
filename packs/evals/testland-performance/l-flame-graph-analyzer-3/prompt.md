---
description: Short prompt that should load flame-graph-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We know which commit made our Go service 30% slower, but the diff is huge. How do we find the hot spot?
