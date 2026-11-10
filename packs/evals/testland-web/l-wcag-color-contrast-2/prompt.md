---
description: Short prompt that should load wcag-color-contrast with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Do these colors pass WCAG AA?

```css
:root { --text: #8a8a8a; --bg: #ffffff; --link: #5fbfff; --button-bg: #2f80ed; --button-text: #ffffff; }
```
