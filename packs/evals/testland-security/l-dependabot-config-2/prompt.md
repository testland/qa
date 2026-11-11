---
description: Short prompt that should load dependabot-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review this dependabot.yml and fix it.

```yaml
version: 2
updates:
  - package-ecosystem: npm
    schedule: { interval: daily }
  - package-ecosystem: docker
    directory: /
```
