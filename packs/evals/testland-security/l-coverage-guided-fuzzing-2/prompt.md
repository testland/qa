---
description: Short prompt that should load coverage-guided-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a fuzz target for this parser.

```rust
pub fn parse_header(input: &[u8]) -> Result<Header, Error> {
    let len = u16::from_be_bytes([input[0], input[1]]) as usize;
    Ok(Header { name: input[2..2 + len].to_vec() })
}
```
