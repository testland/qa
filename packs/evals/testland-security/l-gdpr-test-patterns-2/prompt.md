---
description: Short prompt that should load gdpr-test-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this account deletion endpoint against GDPR.

```python
@app.delete('/me')
def delete_me(user=Depends(current_user)):
    db.users.delete(user.id)
    return {'ok': True}
```
