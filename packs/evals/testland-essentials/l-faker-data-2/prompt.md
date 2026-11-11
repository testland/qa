---
description: Short prompt that should load faker-data with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This factory sometimes makes the test fail because the phone number isn't E.164. Fix it.

```python
from faker import Faker
fake = Faker()
def make_user():
    return {'name': fake.name(), 'phone': fake.phone_number(), 'email': fake.email()}
```
