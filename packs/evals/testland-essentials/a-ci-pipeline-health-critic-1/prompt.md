---
description: Short prompt that should delegate to the ci-pipeline-health-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this CI config for test pipeline problems.

```yaml
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx jest --retries 5
```
