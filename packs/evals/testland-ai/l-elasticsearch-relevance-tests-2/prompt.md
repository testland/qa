---
description: Short prompt that should load elasticsearch-relevance-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Create a relevance test before we change this analyzer.

```json
"analyzer": { "product": { "tokenizer": "standard", "filter": ["lowercase", "synonym_graph"] } }
```
