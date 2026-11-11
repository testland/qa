---
description: Short prompt that should load godot-gut-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write GUT tests for this script, including the signal.

```gdscript
extends Node
signal died
var health := 100
func take_damage(n: int) -> void:
    health -= n
    if health <= 0:
        died.emit()
```
