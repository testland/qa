---
description: Short prompt that should load sonarqube-rules with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Configure SonarCloud for this monorepo.

```
apps/web   (TypeScript)
apps/api   (Java, Maven)
libs/py    (Python)
```
