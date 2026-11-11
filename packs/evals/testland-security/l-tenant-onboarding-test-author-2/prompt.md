---
description: Short prompt that should load tenant-onboarding-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this onboarding flow, including running it twice.

```python
def provision_tenant(name, plan):
    t = Tenant.create(name=name, plan=plan)
    create_schema(t.id)
    seed_defaults(t.id)
    billing.create_customer(t.id)
    return t
```
