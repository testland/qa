---
description: Should load sonarqube-maintainability-gate when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up SonarCloud on pull requests so a PR fails when it lowers the maintainability rating or adds code smells.
