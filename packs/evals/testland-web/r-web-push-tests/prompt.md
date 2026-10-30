---
description: Should load web-push-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A PWA sends browser push notifications. Write release tests for subscribing with VAPID keys, receiving a push, and handling an expired subscription.
