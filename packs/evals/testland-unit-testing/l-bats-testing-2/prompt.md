---
description: Short prompt that should load bats-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this script's exit codes and output.

```bash
#!/usr/bin/env bash
[ $# -eq 1 ] || { echo 'usage: greet NAME' >&2; exit 2; }
echo "hello, $1"
```
