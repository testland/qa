---
description: Short prompt that should delegate to the test-script-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this manual test script.

| Step | Action | Expected |
|---|---|---|
| 1 | Log in and go to settings and change the email and save | It works |
| 2 | Check the email | Correct |
