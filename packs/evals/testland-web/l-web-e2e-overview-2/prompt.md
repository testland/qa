---
description: Short prompt that should load web-e2e-overview with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have a Next.js app with no browser tests. Here's the login page:

```tsx
export default function Login() { return <form action="/api/login"><input name="email"/><input name="password" type="password"/><button>Log in</button></form>; }
```

Where do we start with E2E tests?
