---
description: Short prompt that should load msw-handlers with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Replace these hand-rolled fetch mocks with something better.

```ts
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, name: 'Ann' }) });
render(<Profile />);
```
