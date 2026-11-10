---
description: Short prompt that should load pytest-asyncio-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this FastAPI endpoint.

```python
from fastapi import FastAPI
app = FastAPI()
@app.get('/health')
async def health():
    return {'ok': True}
```
