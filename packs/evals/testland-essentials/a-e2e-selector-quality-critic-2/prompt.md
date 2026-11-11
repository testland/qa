---
description: Short prompt that should delegate to the e2e-selector-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our E2E tests break every time design changes a CSS class. Which selectors in our Cypress suite are fragile?
