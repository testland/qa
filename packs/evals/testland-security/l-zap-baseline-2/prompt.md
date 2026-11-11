---
description: Short prompt that should load zap-baseline with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a ZAP scan to this workflow for our staging URL.

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh staging
```
