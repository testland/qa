---
description: Short prompt that should load selenium-grid-4-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Turn this into a Selenium Grid with Chrome and Firefox nodes.

```yaml
services:
  chrome:
    image: selenium/standalone-chrome
    ports: ["4444:4444"]
```
