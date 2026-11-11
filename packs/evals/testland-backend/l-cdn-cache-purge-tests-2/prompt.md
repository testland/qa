---
description: Short prompt that should load cdn-cache-purge-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that publishing an article purges it from Cloudflare and readers see the new version.

```js
await cms.publish(articleId);
await cloudflare.purge({ files: [`https://news.io/a/${articleId}`] });
```
