---
description: Short prompt that should load oauth-flow-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this OAuth callback.

```js
app.get('/callback', async (req, res) => {
  const tokens = await client.callback(REDIRECT, req.query, { code_verifier: req.session.verifier });
  req.session.tokens = tokens; res.redirect('/');
});
```
