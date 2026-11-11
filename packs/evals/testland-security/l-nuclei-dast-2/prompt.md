---
description: Short prompt that should load nuclei-dast with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a custom Nuclei template that checks our /debug endpoint isn't exposed.

```
GET /debug HTTP/1.1
Host: staging.shop.io

HTTP/1.1 200 OK
{"env": "staging", "db_password": "..."}
```
