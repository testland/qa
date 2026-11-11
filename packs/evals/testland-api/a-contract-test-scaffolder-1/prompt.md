---
description: Short prompt that should delegate to the contract-test-scaffolder agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scaffold contract tests from this OpenAPI spec.

```yaml
paths:
  /orders/{id}:
    get:
      responses:
        '200': { content: { application/json: { schema: { $ref: '#/components/schemas/Order' } } } }
        '404': {}
```
