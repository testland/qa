---
description: Short prompt that should load jacoco-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fail this Maven build when line coverage is under 80%.

```xml
<build><plugins>
  <plugin><artifactId>maven-surefire-plugin</artifactId></plugin>
</plugins></build>
```
