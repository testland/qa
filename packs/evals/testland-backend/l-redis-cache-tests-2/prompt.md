---
description: Short prompt that should load redis-cache-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this cache-aside code, including invalidation on update.

```python
def get_user(uid):
    if (v := r.get(f'user:{uid}')):
        return json.loads(v)
    u = db.load(uid)
    r.setex(f'user:{uid}', 300, json.dumps(u))
    return u
```
