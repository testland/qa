---
description: Short prompt that should load language-native-sast with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set up security linting for this Go service and make CI fail on new findings only.

```
cmd/api/main.go
internal/db/query.go
internal/files/upload.go
```
