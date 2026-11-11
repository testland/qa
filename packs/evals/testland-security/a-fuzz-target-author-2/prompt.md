---
description: Short prompt that should delegate to the fuzz-target-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write a coverage-guided fuzz harness for our Rust `decode_frame(&[u8])` function, with a seed corpus.
