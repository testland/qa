# Session endpoints — internal notes

## POST /api/session

Creates a session. Rewritten in April 2026 when the login page moved to React.

- Accepts `application/json` **only**. The endpoint returns **415 Unsupported
  Media Type** for `application/x-www-form-urlencoded`; this was deliberate, to
  close the CSRF hole the old form POST had.
- Body: `{"email": "...", "password": "..."}`. Note the field is `email`, not
  `username`; the old form used `username` and we kept the old name nowhere.
- On success: `204`, plus `Set-Cookie: bp_session=<opaque>; HttpOnly; Secure;
  SameSite=Lax; Path=/; Max-Age=28800`.
- There is no bearer token anywhere in the product. Everything server-side
  reads `bp_session`.

## GET /logout

Clears `bp_session` and redirects to `/login`. Idempotent, no confirmation, no
POST required — it has been on our list to change since 2024.

## Authenticated pages

Every route other than `/`, `/pricing`, `/status`, `/signup` and `/login`
returns `302 -> /login` without a valid `bp_session`.

Signed-in pages render a header containing `<a href="/logout">Sign out</a>` and
a `data-tenant` attribute on `<body>`. The login page renders the string
`Sign in to Brightpath` and, after a rejected attempt, `Those details did not
match`.
