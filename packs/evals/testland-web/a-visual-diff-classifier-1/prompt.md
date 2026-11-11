---
description: Short prompt that should delegate to the visual-diff-classifier agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our Percy build has 37 diffs after a font upgrade. Classify each as intentional, incidental or a regression.
