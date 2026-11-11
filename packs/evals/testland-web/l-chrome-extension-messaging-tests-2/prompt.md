---
description: Short prompt that should load chrome-extension-messaging-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this background message handler.

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getUser') { fetchUser().then(sendResponse); return true; }
});
```
