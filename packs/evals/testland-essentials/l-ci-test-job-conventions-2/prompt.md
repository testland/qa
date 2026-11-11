---
description: Short prompt that should load ci-test-job-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review this CI test job and tell me what to change.

```yaml
test:
  script: npm test -- --retries 3
  timeout: 6h
  artifacts: { paths: [reports/], expire_in: never }
```
