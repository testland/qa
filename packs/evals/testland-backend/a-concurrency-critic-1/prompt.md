---
description: Short prompt that should delegate to the concurrency-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Look for race conditions and deadlock risks in this code.

```go
var cache = map[string]*User{}
func Get(id string) *User {
  if u, ok := cache[id]; ok { return u }
  u := load(id)
  cache[id] = u
  return u
}
```
