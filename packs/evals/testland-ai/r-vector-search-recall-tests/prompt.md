---
description: Should load vector-search-recall-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The team switched embedding models and tuned HNSW parameters in pgvector. Measure whether search recall dropped.
