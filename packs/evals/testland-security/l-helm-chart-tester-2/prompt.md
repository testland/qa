---
description: Short prompt that should load helm-chart-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write helm-unittest tests for this template.

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: {{ .Values.replicas | default 2 }}
  template:
    spec:
      containers:
        - image: "{{ .Values.image.repo }}:{{ .Values.image.tag }}"
```
