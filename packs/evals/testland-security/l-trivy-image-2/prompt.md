---
description: Short prompt that should load trivy-image with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Make this CI step fail only on fixable critical vulnerabilities.

```yaml
- run: docker build -t app:ci .
- run: trivy image app:ci
```
