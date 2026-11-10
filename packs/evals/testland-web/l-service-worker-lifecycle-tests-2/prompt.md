---
description: Short prompt that should load service-worker-lifecycle-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this service worker update flow.

```js
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(precache()); });
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
```
