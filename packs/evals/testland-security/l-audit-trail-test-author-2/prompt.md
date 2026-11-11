---
description: Short prompt that should load audit-trail-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests that this admin action is audit-logged correctly.

```python
@admin_required
def change_role(user_id, role):
    user = User.get(user_id)
    user.role = role
    user.save()
```
