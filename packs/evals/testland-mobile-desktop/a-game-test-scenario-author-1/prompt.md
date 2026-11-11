---
description: Short prompt that should delegate to the game-test-scenario-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write tests for our Unity game's inventory system and the boss fight scene.
