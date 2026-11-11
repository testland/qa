---
description: Short prompt that should load dbt-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our dbt build passes but the orders table has duplicate order IDs. Why didn't anything catch it?
