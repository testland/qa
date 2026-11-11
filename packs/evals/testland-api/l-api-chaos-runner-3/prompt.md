---
description: Short prompt that should load api-chaos-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our service hung for 10 minutes when a downstream API slowed down, even though we have retries. How do we test that?
