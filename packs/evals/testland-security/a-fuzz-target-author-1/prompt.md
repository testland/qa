---
description: Short prompt that should delegate to the fuzz-target-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scaffold a fuzz target for this function.

```go
func ParseQuery(s string) (map[string][]string, error)
```
