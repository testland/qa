---
description: Short prompt that should load migration-operation-taxonomy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our last migration locked the orders table for 20 minutes and took the site down. How do we check migrations before they run?
