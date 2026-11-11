---
description: Short prompt that should load mailpit-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that checks this password reset email.

```python
def send_reset(user):
    smtp.sendmail('no-reply@shop.test', user.email, render('reset.html', link=make_link(user)))
```
