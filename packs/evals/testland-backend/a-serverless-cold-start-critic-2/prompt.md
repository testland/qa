---
description: Short prompt that should delegate to the serverless-cold-start-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our Lambdas take 4 seconds on cold start. Review the function code and config for anti-patterns.
