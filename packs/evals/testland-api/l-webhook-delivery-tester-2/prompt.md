---
description: Short prompt that should load webhook-delivery-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this webhook receiver.

```python
@app.post('/hooks')
def hook(req):
    sig = hmac.new(SECRET, req.body, 'sha256').hexdigest()
    if sig != req.headers['X-Signature']: abort(401)
    process(req.json)
```
