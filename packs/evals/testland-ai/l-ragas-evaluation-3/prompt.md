---
description: Short prompt that should load ragas-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our RAG answers got worse after we changed the chunk size, but we can't tell if retrieval or generation is the problem. How do we measure that?
