---
description: Short prompt that should load cross-tenant-data-leak-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests that tenant A can't read tenant B's invoices here.

```ts
app.get('/api/invoices/:id', auth, async (req, res) => {
  res.json(await db.invoice.findUnique({ where: { id: req.params.id } }));
});
```
