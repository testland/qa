---
description: Short prompt that should load attack-surface-test-checklist with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This PR adds password reset. List the security tests it needs.

```python
@app.post('/reset')
def reset(email: str):
    token = secrets.token_hex(8)
    db.save_token(email, token)
    mail.send(email, f'https://app.io/reset?t={token}')
```
