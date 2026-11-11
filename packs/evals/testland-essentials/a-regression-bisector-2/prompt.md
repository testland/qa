---
description: Short prompt that should delegate to the regression-bisector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our build started failing sometime in the last 200 commits. Bisect to find the culprit.
