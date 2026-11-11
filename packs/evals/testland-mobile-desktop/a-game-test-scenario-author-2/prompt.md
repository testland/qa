---
description: Short prompt that should delegate to the game-test-scenario-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author automated tests for our Godot 4 platformer: jumping, coins and the level-complete signal.
