---
description: Short prompt that should load add-to-homescreen-flow-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this install button.

```js
let deferred;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installBtn.hidden = false; });
installBtn.onclick = async () => { deferred.prompt(); const { outcome } = await deferred.userChoice; track(outcome); };
```
