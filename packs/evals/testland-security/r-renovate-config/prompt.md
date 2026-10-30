---
description: Should load renovate-config when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a renovate.json for a monorepo: group minor and patch updates weekly on Monday mornings, automerge devDependencies patches, and open security updates immediately.
