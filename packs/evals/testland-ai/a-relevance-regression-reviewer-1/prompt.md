---
description: Short prompt that should delegate to the relevance-regression-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We changed the BM25 boosts on title. Before: NDCG@10 0.71, MRR 0.64. After: NDCG@10 0.73, MRR 0.58. Review the change per query and tell me if it's a regression.
