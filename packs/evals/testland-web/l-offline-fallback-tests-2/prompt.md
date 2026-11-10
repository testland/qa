---
description: Short prompt that should load offline-fallback-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that this route still loads offline.

```js
registerRoute(({url}) => url.pathname.startsWith('/articles'), new NetworkFirst({ cacheName: 'articles' }));
```
