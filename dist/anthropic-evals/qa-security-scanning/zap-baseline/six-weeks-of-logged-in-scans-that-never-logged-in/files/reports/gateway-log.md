# API gateway, scan window 2026-09-09 01:00–01:03 UTC

Filtered to the scanner's source address (10.40.7.19).

| Count | Request                        | Status | Notes                                    |
|-------|--------------------------------|--------|------------------------------------------|
| 38    | POST /api/session              | 415    | content-type: application/x-www-form-urlencoded |
| 6     | GET /logout                    | 302    | -> /login, Set-Cookie: bp_session=; Max-Age=0 |
| 51    | GET /tenants                   | 302    | -> /login                                |
| 44    | GET /settings/*                | 302    | -> /login                                |
| 12    | GET /audit                     | 302    | -> /login                                |
| 4     | GET / , /pricing, /status, /signup | 200 | served                                   |

No request from that address in the window carried a `bp_session` cookie.
No request from that address in the window carried an `Authorization` header.

Same shape on every night sampled: 2026-08-04, 2026-08-19, 2026-09-01,
2026-09-09.
