---
description: Short prompt that should load gitlab-ci-test-jobs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our GitLab pipeline runs the full test suite on every docs change. How do we limit when it runs?
