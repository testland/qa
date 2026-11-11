---
description: Short prompt that should load web-vitals-inp-deep with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This click handler makes our INP over 500 ms. How do we test and fix it?

```js
button.addEventListener('click', () => {
  const rows = filterProducts(allProducts, query); // 40k items
  table.innerHTML = rows.map(renderRow).join('');
});
```
