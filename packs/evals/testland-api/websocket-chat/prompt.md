---
description: Should load websocket-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write automated tests for our chat server's WebSocket endpoint: connect, send a message, receive the broadcast, and reconnect after the server drops.
