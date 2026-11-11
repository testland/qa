---
description: Short prompt that should load mfa-flow-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this 2FA login step.

```python
@app.post('/login/otp')
def otp(code: str, user=Depends(pending_user)):
    if not pyotp.TOTP(user.secret).verify(code): raise HTTPException(401)
    return issue_session(user)
```
