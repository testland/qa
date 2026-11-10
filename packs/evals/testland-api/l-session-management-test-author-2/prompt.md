---
description: Short prompt that should load session-management-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this login handler.

```python
@app.post('/login')
def login(form):
    user = auth(form)
    session['user_id'] = user.id
    return redirect('/')
```
