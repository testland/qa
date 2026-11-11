---
description: Short prompt that should load malicious-payload-bank with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Give me attack payloads for negative tests of this search endpoint.

```js
app.get('/search', (req, res) => {
  db.query(`SELECT * FROM items WHERE name LIKE '%${req.query.q}%'`).then(r => res.send(`<h1>${req.query.q}</h1>` + render(r)));
});
```
