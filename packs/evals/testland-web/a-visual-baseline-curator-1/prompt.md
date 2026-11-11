---
description: Short prompt that should delegate to the visual-baseline-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Propose the initial visual baselines for our Storybook with 140 stories and set up Chromatic for them.
