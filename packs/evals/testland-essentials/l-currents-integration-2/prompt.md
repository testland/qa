---
description: Short prompt that should load currents-integration with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add Currents to this Playwright config so we get run history.

```ts
export default defineConfig({ reporter: [['html']], retries: 2, workers: 4 });
```
