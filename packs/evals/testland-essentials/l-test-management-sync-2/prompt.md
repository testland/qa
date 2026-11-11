---
description: Short prompt that should load test-management-sync with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Push these JUnit results into Xray after each build on main.

```yaml
- run: mvn test
- uses: actions/upload-artifact@v4
  with: { name: junit, path: target/surefire-reports }
```
