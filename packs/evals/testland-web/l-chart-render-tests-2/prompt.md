---
description: Short prompt that should load chart-render-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that catches visual changes in this Chart.js chart.

```js
new Chart(ctx, { type: 'bar', data: { labels: ['Q1','Q2','Q3'], datasets: [{ data: [12, 19, 7] }] } });
```
