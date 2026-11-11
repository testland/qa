---
description: Short prompt that should delegate to the defect-pipeline-runner agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Run our weekly defect review on these 120 open bugs: cluster them by root cause, describe the trend and draft the actions.
