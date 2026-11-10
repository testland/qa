---
description: Short prompt that should load rtl-rendering-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Check this CSS for right-to-left problems.

```css
.sidebar { float: left; margin-right: 24px; }
.icon-back { background: url(arrow-left.svg); }
.price { text-align: right; padding-left: 8px; }
```
