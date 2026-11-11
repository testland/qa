---
description: Short prompt that should load langfuse-tracing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add tracing with cost and latency to this function.

```python
def summarize(ticket):
    resp = openai.chat.completions.create(model='gpt-4.1-mini', messages=[{'role': 'user', 'content': ticket.text}])
    return resp.choices[0].message.content
```
