---
description: Short prompt that should load karate-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Karate feature for this endpoint.

```
POST /api/users  {"name": "Ann"}  -> 201 {"id": 7, "name": "Ann", "createdAt": "..."}
```
