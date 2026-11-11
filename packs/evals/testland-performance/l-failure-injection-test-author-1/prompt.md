---
description: Short prompt that should load failure-injection-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I reproduce a failure that needs both a bad HTTP response and a slow network?
