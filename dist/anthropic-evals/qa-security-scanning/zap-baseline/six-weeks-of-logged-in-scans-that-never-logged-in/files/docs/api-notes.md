# Session endpoints — internal notes

## POST /api/session

Rewritten in April 2026 when the login page moved to React.

- Request content type: `application/json`. Anything else returns 415.
- Body: `{"email": "...", "password": "..."}`.
- Success: `204`, plus `Set-Cookie: bp_session=<opaque>; HttpOnly; Secure;
  SameSite=Lax; Path=/; Max-Age=900`.
- The cookie is reissued on every authenticated response. A session that goes
  15 minutes without a request is gone and the next request 302s to `/login`.

## GET /logout

Clears `bp_session` and redirects to `/login`. Idempotent, no confirmation, no
POST required — it has been on our list to change since 2024.

## Authenticated pages

Every route other than `/`, `/pricing`, `/status`, `/signup` and `/login`
returns `302 -> /login` without a valid `bp_session`.

## Response body excerpts, captured by hand 2026-09-10

Signed-in shell, `GET /tenants` 200:

```html
<body data-tenant="acme-prod">
  <header class="app-nav">
    <span class="who">Signed in as scanner@brightpath.dev</span>
    <a href="/logout">Sign out</a>
  </header>
```

Login page, `GET /login` 200:

```html
<main class="auth">
  <h1>Sign in to Brightpath</h1>
```

Login page after a rejected attempt:

```html
  <p class="error">Those details did not match</p>
```
