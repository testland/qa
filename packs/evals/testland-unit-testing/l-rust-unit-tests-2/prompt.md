---
description: Short prompt that should load rust-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Rust function.

```rust
pub fn word_count(s: &str) -> usize {
    s.split_whitespace().count()
}
```
