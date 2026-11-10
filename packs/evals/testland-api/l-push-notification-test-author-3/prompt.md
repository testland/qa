---
description: Short prompt that should load push-notification-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We keep sending pushes to uninstalled apps and APNs returns errors. How do we test that cleanup?
