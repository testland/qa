---
description: Short prompt that should load giskard-llm with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Scan this support bot for prompt injection and data leaks.

```python
def support_bot(message: str) -> str:
    return client.chat(system=SYSTEM_PROMPT_WITH_INTERNAL_POLICIES, user=message)
```
