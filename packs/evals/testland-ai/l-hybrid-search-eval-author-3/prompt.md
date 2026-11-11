---
description: Short prompt that should load hybrid-search-eval-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We added a reranker to our search and it doubled latency. How do we know if it's worth it?
