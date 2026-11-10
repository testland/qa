---
description: Short prompt that should load restler-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have this OpenAPI spec for a create, update, delete flow. Set up stateful fuzzing for it.

```yaml
paths:
  /carts: { post: {} }
  /carts/{id}/items: { post: {} }
  /carts/{id}: { delete: {} }
```
