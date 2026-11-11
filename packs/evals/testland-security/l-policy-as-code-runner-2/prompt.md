---
description: Short prompt that should load policy-as-code-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Conftest policy that rejects this.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  template:
    spec:
      containers:
        - name: api
          image: api:latest
```
