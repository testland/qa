---
description: Short prompt that should load hybrid-search-eval-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Compare these retrieval setups for our docs search: BM25 only, vectors only, RRF fusion, and RRF plus a cross-encoder reranker. We have 200 judged queries.
