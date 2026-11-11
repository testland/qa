---
description: Short prompt that should delegate to the quality-coach agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Is this story actually done? 'Users can reset their password by email.' Dev says done: code merged, one happy-path test, not deployed to staging yet.
