---
description: Short prompt that should load deepeval-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests that check this RAG answer is faithful to its context.

```python
def answer(question: str) -> tuple[str, list[str]]:
    docs = retriever.search(question, k=4)
    return llm.complete(PROMPT.format(q=question, ctx=docs)), docs
```
