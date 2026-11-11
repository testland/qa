---
description: Short prompt that should load hipaa-test-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our clinic app has this endpoint. What HIPAA tests does it need?

```js
app.get('/patients/:id/notes', auth, async (req, res) => {
  res.json(await db.notes.find({ patientId: req.params.id }));
});
```
