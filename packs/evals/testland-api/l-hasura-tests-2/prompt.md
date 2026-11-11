---
description: Short prompt that should load hasura-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Hasura permission.

```yaml
table: orders
select_permissions:
  - role: user
    permission:
      filter: { user_id: { _eq: X-Hasura-User-Id } }
      columns: [id, total]
```
