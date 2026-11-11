---
description: Short prompt that should load cloudflare-workers-miniflare with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Worker that uses KV.

```ts
export default {
  async fetch(req: Request, env: Env) {
    const hit = await env.LINKS.get(new URL(req.url).pathname);
    return hit ? Response.redirect(hit, 302) : new Response('Not found', { status: 404 });
  },
};
```
