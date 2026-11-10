---
description: Short prompt that should load a11y-violation-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our axe scan in CI reports 412 violations on main. Make the pipeline fail only when a PR adds new ones.

```yaml
- run: npx @axe-core/cli http://localhost:3000 --exit
```
