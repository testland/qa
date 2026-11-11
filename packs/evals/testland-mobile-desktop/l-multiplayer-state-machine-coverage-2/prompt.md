---
description: Short prompt that should load multiplayer-state-machine-coverage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Build the test matrix for our Unity Netcode game: host, join, disconnect, reconnect and host migration under 200 ms latency and 5% packet loss.
