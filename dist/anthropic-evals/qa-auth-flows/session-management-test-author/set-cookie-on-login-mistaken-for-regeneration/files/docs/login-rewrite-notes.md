# March rewrite — notes kept by Devon, plus the devtools capture

The old login was a form POST that re-rendered the page. The new one is:

```js
await fetch('/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ user, pass }),
});
```

Nothing in `src/sessionStore.js` changed. `src/app.js` changed only in the
login branch, which used to render a redirect and now returns JSON.

## Devtools capture, 2 September (values redacted by our logging proxy)

```
GET /
  < 200
  < set-cookie: sid=<redacted>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800

POST /login
  > cookie: sid=<redacted>
  < 200
  < set-cookie: sid=<redacted>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800

GET /dashboard
  > cookie: sid=<redacted>
  < 200
```

Devon's reading of the capture: "there is a `set-cookie` on the login response,
therefore the session is being reissued."

## What the college told us

- Terminals run a kiosk profile that is discarded at logout; cookies do not
  survive a session on the machine that signed in.
- The machine that read the account (`LIB-PC-14`) reached `GET /dashboard`
  first. It made no request to `POST /login` on 2 September at all.
- Both machines were on the same NAT address, `198.51.100.9`.
- Anyone with a library card can use the terminals unsupervised, and the
  browser home page on every terminal is set by the college's IT team.
