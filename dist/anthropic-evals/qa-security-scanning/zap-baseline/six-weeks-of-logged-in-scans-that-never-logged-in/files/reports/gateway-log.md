# API gateway access log — scan window 2026-09-09 01:00–01:03 UTC

Filtered to 10.40.7.19, the scan runner. Fields: time, method, path, status,
request content-type, cookie names on the request, Authorization header.

```
01:00:11 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
01:00:12 GET  /                  200  ct=-                                  cookies=-  auth=-
01:00:13 GET  /pricing           200  ct=-                                  cookies=-  auth=-
01:00:13 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
01:00:14 GET  /tenants           302  ct=-                                  cookies=-  auth=-
01:00:15 GET  /status            200  ct=-                                  cookies=-  auth=-
01:00:16 GET  /settings/profile  302  ct=-                                  cookies=-  auth=-
01:00:17 GET  /logout            302  ct=-                                  cookies=-  auth=-
01:00:18 GET  /signup            200  ct=-                                  cookies=-  auth=-
01:00:19 GET  /audit             302  ct=-                                  cookies=-  auth=-
01:00:19 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
```

Totals for the whole window, same source:

| Count | Request             | Status | Notes from the gateway |
|-------|---------------------|--------|------------------------|
| 38    | POST /api/session   | 415    | —                      |
| 6     | GET /logout         | 302    | Set-Cookie: bp_session=; Max-Age=0 |
| 51    | GET /tenants        | 302    | Location: /login       |
| 44    | GET /settings/*     | 302    | Location: /login       |
| 12    | GET /audit          | 302    | Location: /login       |
| 4     | GET / /pricing /status /signup | 200 | —           |

Requests in the window carrying a `bp_session` cookie: 0.
Requests in the window carrying an `Authorization` header: 0.
Responses in the window with a `2xx` status other than the four public pages: 0.

Same shape on every night sampled: 2026-08-04, 2026-08-19, 2026-09-01,
2026-09-09.
