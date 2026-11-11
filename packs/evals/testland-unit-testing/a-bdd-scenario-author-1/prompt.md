---
description: Short prompt that should delegate to the bdd-scenario-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write Gherkin scenarios and step definitions for this story: 'As a shopper I can save items to a wishlist and move them to the cart later.'
