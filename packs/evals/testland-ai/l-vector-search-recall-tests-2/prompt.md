---
description: Short prompt that should load vector-search-recall-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're tuning HNSW in Qdrant: ef=64, m=16. Measure recall@10 against exact search and show the latency trade-off.
