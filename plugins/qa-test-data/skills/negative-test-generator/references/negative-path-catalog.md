# Negative-path catalog

For each happy-path test of a request `<verb> <path>` with body fields
`<f1, f2, ...>`, the negative-test set covers these categories.

## 1. Schema violations (validation rejection)

| Pattern                                | Test                                                |
|----------------------------------------|-----------------------------------------------------|
| Missing required field                  | Send the request without `<f1>`; expect 400 with `<f1>` named. |
| Wrong type                              | Send `<f1>` as wrong type (string where int expected); expect 400. |
| Out-of-range value                      | Send `<f1>` outside `[min, max]` per `boundary-value-generator`; expect 400. |
| Wrong enum value                        | Send `<f1>` with a value not in `enum_values`; expect 400. |
| Wrong format                            | String that fails the regex / format constraint; expect 400. |
| Extra unknown field                     | Send field not in the schema; behavior depends on policy (strict reject vs. ignore). |
| Empty / null where forbidden            | Send `null` or empty string for a non-nullable field. |
| Excess length / count                   | Send string longer than max-length; collection larger than max-count. |

## 2. Authentication failures

| Pattern                            | Test                                            |
|------------------------------------|-------------------------------------------------|
| No `Authorization` header           | Expect 401.                                      |
| Expired token                        | Expect 401 with `token expired` indication.     |
| Malformed token                      | Expect 401, no info leak about token shape.     |
| Token from a different tenant        | Expect 401 / 403.                                |

## 3. Authorization failures

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| User without permission              | Authenticated but role lacks required permission; expect 403. |
| Resource owned by another user        | Read/write attempt on someone else's resource (IDOR); expect 403 / 404. |
| Cross-tenant access                   | Attempt resource from another organization; expect 403 / 404. |

## 4. Rate / quota failures

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Burst exceeds rate limit            | Send N+1 requests in window; expect 429.          |
| Plan quota exceeded                  | Free-tier user exceeds Free quota; expect 403 / 429 with quota info. |

## 5. Conflict / state errors

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Duplicate creation                   | Create same resource twice; expect 409.          |
| Optimistic-lock conflict             | Stale `If-Match`; expect 412.                     |
| State machine violation              | Invalid status transition (e.g. `placed → completed` skipping `shipped`); expect 422 / 409. |

## 6. Adversarial inputs

Pull from `malicious-payload-bank`:

| Field type                   | Payload classes                                  |
|------------------------------|--------------------------------------------------|
| Free-text input               | XSS, SQLi, Unicode confusables                  |
| URL field                     | SSRF, open-redirect                              |
| File upload name              | Path traversal                                   |
| Search field                  | ReDoS, SQLi                                      |

Starter payloads per class (aligned with the [OWASP Top 10](https://owasp.org/www-project-top-ten/)
and [CWE Top 25](https://cwe.mitre.org/top25/); the full catalog with
encoded variants and per-context selection lives in
`malicious-payload-bank`):

| Class | Starter payloads |
|---|---|
| SQLi (CWE-89) | `' OR '1'='1' --` · `'; DROP TABLE users; --` · `admin'--` |
| XSS (CWE-79) | `<script>alert(1)</script>` · `<img src=x onerror=alert(1)>` · `javascript:alert(1)` |
| SSRF (CWE-918) | `http://169.254.169.254/latest/meta-data/` · `http://localhost:6379/` · `file:///etc/passwd` |
| Path traversal (CWE-22) | `../etc/passwd` · `..%2fetc%2fpasswd` · `....//etc/passwd` |
| ReDoS (CWE-1333) | `aaaaaaaaaaaaaaaaaaaaaaaa!` (vs `/^(a+)+$/`) · `aaaaaaaaaaaaaaaaaaaaaaaa@aaaaaa` (vs typical email regexes) |
| Unicode confusables | `аdmin` (Cyrillic `а` U+0430) · `gооgle.com` · `ﬀ` (ff ligature) |

Assert **reject (4xx) or escaped output** - never that the payload
merely "didn't crash".

## 7. Server errors (where applicable)

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Upstream dependency unavailable    | Mock the dependency to fail (per `api-chaos-runner`); expect 502 / 503 with retry hint. |
| Timeout                            | Mock slow upstream; expect 504 / circuit-breaker fallback. |
