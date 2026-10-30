---
description: Should load living-documentation-publisher when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Cucumber scenarios pass in CI. Publish an HTML report that product owners can read to see which acceptance criteria pass, updated on every merge to main.
