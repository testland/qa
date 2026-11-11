---
description: Short prompt that should load chaos-mesh with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Chaos Mesh experiment that kills one pod of this deployment every 10 minutes in the staging namespace only.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: cart, namespace: staging, labels: { app: cart } }
```
