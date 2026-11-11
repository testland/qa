---
description: Short prompt that should delegate to the security-finding-triager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We have SAST, DAST, secrets, SCA, container and IaC reports for this release. Give me one block or pass verdict.
