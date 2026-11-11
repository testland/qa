---
description: Short prompt that should load pseudo-localization-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a pseudo-locale to this i18next setup so we can spot hardcoded text.

```js
i18next.init({ lng: 'en', resources: { en: { translation: en } } });
```
