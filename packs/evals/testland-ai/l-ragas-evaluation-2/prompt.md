---
description: Short prompt that should load ragas-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Evaluate this RAG output with context precision and faithfulness.

```json
{"question": "What is the return window?", "contexts": ["Returns accepted within 30 days.", "Shipping is free over $50."], "answer": "You can return items within 60 days."}
```
