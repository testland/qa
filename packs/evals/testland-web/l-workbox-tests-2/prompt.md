---
description: Short prompt that should load workbox-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Workbox config.

```js
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({request}) => request.destination === 'image', new CacheFirst({ cacheName: 'img', plugins: [new ExpirationPlugin({ maxEntries: 60 })] }));
```
