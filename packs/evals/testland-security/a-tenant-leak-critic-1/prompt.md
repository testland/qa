---
description: Short prompt that should delegate to the tenant-leak-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this PR for tenant data leak risks.

```ts
app.get('/api/projects/:id', async (req, res) => {
  const tenant = req.query.tenantId;
  res.json(await db.project.findFirst({ where: { id: req.params.id } }));
});
```
