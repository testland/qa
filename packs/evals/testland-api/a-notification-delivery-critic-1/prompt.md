---
description: Short prompt that should delegate to the notification-delivery-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this PR's email and SMS sending code for delivery problems.

```python
def notify(user, msg):
    smtp.send(user.email, msg)
    twilio.messages.create(to=user.phone, body=msg)
```
