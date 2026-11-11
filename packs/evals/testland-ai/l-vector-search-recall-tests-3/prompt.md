---
description: Short prompt that should load vector-search-recall-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After we switched embedding models, our semantic search started missing obvious results. How do we test recall?
