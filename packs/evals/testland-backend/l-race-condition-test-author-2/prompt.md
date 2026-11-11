---
description: Short prompt that should load race-condition-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This counter loses increments under load. Write a regression test that fails before the fix.

```go
type Counter struct{ n int }
func (c *Counter) Inc() { c.n++ }
```
