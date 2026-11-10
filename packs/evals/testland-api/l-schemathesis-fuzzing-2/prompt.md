---
description: Short prompt that should load schemathesis-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fuzz this API from its schema.

```bash
curl http://localhost:8000/openapi.json | head -5
{"openapi": "3.1.0", "info": {"title": "Shop"}, "paths": {"/items": ...
```
