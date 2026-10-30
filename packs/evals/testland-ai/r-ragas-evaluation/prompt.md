---
description: Should load ragas-evaluation when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Evaluate a RAG chatbot over company docs: measure faithfulness, answer relevancy and context precision on a set of 50 questions.
