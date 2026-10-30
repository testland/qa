---
description: Should load traceability-matrix-builder when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Build a matrix that maps Jira requirements to test cases and shows which requirements have no tests, for an audit.
