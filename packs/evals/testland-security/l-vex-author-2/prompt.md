---
description: Short prompt that should load vex-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our scanner flags CVE-2023-44487 (HTTP/2 rapid reset) in a Go library, but our service only speaks HTTP/1.1 behind a proxy. Record that properly.
