---
description: Short prompt that should delegate to the token-storage-security-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scan our frontend and mobile code for JWTs in localStorage and auth cookies without httpOnly or Secure.
