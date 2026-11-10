---
description: Short prompt that should load proptest-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a proptest that checks this round trip.

```rust
pub fn to_hex(b: &[u8]) -> String { b.iter().map(|x| format!("{:02x}", x)).collect() }
pub fn from_hex(s: &str) -> Vec<u8> { (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i+2], 16).unwrap()).collect() }
```
