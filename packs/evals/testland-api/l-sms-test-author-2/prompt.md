---
description: Short prompt that should load sms-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this SMS sender.

```python
def send_code(phone, code):
    client.messages.create(to=phone, from_=FROM, body=f'Your code is {code}')
```
