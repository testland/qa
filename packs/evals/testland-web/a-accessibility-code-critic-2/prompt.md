---
description: Short prompt that should delegate to the accessibility-code-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check our modal dialog component for WCAG 2.2 problems like focus handling and missing labels.
