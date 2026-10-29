---
description: Should load bats-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests for our bash deployment script `deploy.sh`: argument parsing, the dry-run flag and the exit code on a missing config file.
