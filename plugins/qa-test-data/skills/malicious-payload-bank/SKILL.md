---
name: malicious-payload-bank
description: "Reference catalog of curated adversarial input payloads keyed by attack class - SQL injection, XSS, SSRF, path traversal, command injection, XXE, prototype pollution, regex DoS, Unicode confusables, header injection - plus per-context guidance for which payloads apply (URL parameter / form input / JSON body / file upload). Use when authoring negative-test cases for input validation, fuzz targets, or a security-focused test suite that needs to exercise the OWASP Top 10 attack surface."
rating: 24
d6: 4
---

# malicious-payload-bank

> **Terminology note:** The payload classes here are
> practitioner-emergent and align with the OWASP Top 10
> ([owasp-top-10][owasp]) and CWE Top 25
> ([cwe-top-25][cwe]) - both authoritative industry sources.
> ISTQB has no canonical entry for "malicious payload"; the
> closest formal term is "security testing."

[owasp]: https://owasp.org/www-project-top-ten/
[cwe]: https://cwe.mitre.org/top25/

A reference catalog of adversarial inputs to use when authoring
negative tests, security tests, or fuzz targets. **This is a
defensive skill** - for testing your **own** application's input
validation, not for unauthorized testing of others' systems.

## When to use

- Writing negative-test cases for an input validator
  (per [`negative-test-generator`](../negative-test-generator/SKILL.md)).
- Authoring a security-focused test suite.
- Generating inputs for a fuzz target (Schemathesis, RESTler,
  AFL).
- Reviewing input-handling code with adversarial intent in mind.

## Payload classes

### SQL Injection (CWE-89)

Apply to: any input that flows into a SQL query (URL params, form
fields, headers, cookies).

```
'                              # syntactic break
' OR '1'='1                    # always-true
' OR '1'='1' --                # comment terminator
'; DROP TABLE users; --        # stacked statement
' UNION SELECT NULL, version() -- # information disclosure via UNION
admin'--                        # bypass auth via comment
```

**Modern context:** parameterized queries / ORM eliminate most SQLi;
the payload bank verifies your input still flows through
parameterization (no string concatenation slipped in).

### Cross-Site Scripting (CWE-79)

Apply to: any input that may be rendered to HTML (display name,
comment text, URL params reflected on the page, error messages).

```
<script>alert(1)</script>
"><script>alert(1)</script>
javascript:alert(1)
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
'-alert(1)-'                   # context-break in JS string
```

**Test contexts:** HTML body, HTML attribute, JS string, URL,
CSS. Each has a different escape requirement; the payloads exercise
each.

### Server-Side Request Forgery (CWE-918)

Apply to: any input that becomes an outbound URL (image fetch,
webhook, OAuth callback, link preview).

```
http://169.254.169.254/latest/meta-data/                # AWS instance metadata
http://metadata.google.internal/                         # GCP metadata
http://localhost:6379/                                    # Redis (no auth in many setups)
file:///etc/passwd                                        # local file read
gopher://localhost:6379/_*1%0d%0aSET%20test%20pwn%0d%0a   # protocol smuggling
```

**Test:** does the application fetch arbitrary user-supplied URLs
without an allowlist? Does it follow redirects to internal hosts?

### Path Traversal (CWE-22)

Apply to: any input that becomes a file path (file uploads,
template names, image paths, log file selection).

```
../etc/passwd
..%2fetc%2fpasswd                # URL-encoded ..
....//etc/passwd                 # double-dot bypass for naive filters
%2e%2e/etc/passwd                 # full URL-encoded
..\..\..\..\windows\win.ini       # Windows
%c0%ae%c0%ae/etc/passwd            # over-long UTF-8 bypass
```

### Command Injection (CWE-78)

Apply to: any input that flows into a shell command, backticks,
`exec` / `system` / `popen`.

```
; ls
| ls
&& cat /etc/passwd
` cat /etc/passwd `
$(cat /etc/passwd)
%0a cat /etc/passwd                # newline-injection
```

### XML External Entity (CWE-611)

Apply to: any input that's parsed as XML (SOAP endpoints, SVG
upload, XML config import).

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

### Prototype Pollution (CWE-1321)

Apply to: any JS / Node.js input that flows into object merge
(query-string parsers, body parsers, lodash `_.merge`, Object spread).

```json
{"__proto__": {"polluted": "yes"}}
{"constructor": {"prototype": {"polluted": "yes"}}}
```

### ReDoS - Regex Denial of Service (CWE-1333)

Apply to: any regex with backtracking applied to user input.

```
aaaaaaaaaaaaaaaaaaaaaaaa!         # for /^(a+)+$/
aaaaaaaaaaaaaaaaaaaaaaaa@aaaaaa   # for typical email regexes
```

**Test:** does the regex complete in linear time on adversarial
input? Tooling like `safe-regex` (Node) or `re2` (Google's
linear-time regex engine) eliminates this class.

### Unicode Confusables / Homoglyph

Apply to: any input that's compared for equality, used as a
display name, or used in security boundaries (admin checks,
domain validation).

```
аdmin            # Cyrillic 'а' (U+0430), not Latin 'a' (U+0061)
gооgle.com       # Cyrillic 'о' in google
"Admin"           # NFKC-normalized variant
ﬀ                # ligature for 'ff'
```

The CLDR / Unicode Consortium maintains the canonical
[confusables list](https://www.unicode.org/Public/security/latest/confusables.txt).

### HTTP Header Injection (CWE-93)

Apply to: any input that flows into a response header (CRLF
injection in URL params reflected as `Location`, `Set-Cookie`).

```
test%0d%0aSet-Cookie:%20admin=true       # CRLF + cookie injection
test%0aLocation:%20http://evil.com        # response splitting
```

## Per-context payload selection

| Context                       | Payload classes to try                                  |
|-------------------------------|---------------------------------------------------------|
| URL query parameter            | SQLi, XSS (reflected), SSRF (if used as URL), path traversal (if used as file ref), CRLF. |
| Form field (text)              | SQLi, XSS (stored), Unicode confusables.                |
| File upload filename            | Path traversal, command injection (if shelled out), Unicode confusables. |
| File upload content             | XXE (if XML), polyglot (image+JS), zip bomb.            |
| JSON body field                 | SQLi, XSS, prototype pollution, Unicode confusables.    |
| HTTP header                     | CRLF, header value injection, Unicode in `Host`.        |
| Webhook URL                     | SSRF, internal-IP variants.                             |
| OAuth `redirect_uri`            | Open redirect, SSRF.                                    |
| Search field (with regex)       | ReDoS, SQLi.                                            |

## How to use in tests

### Negative test (rejection-path verification)

```python
import pytest

XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
]

@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_comment_field_rejects_or_escapes_xss(payload):
    response = post_comment(text=payload)
    # Either the input is rejected (4xx) or the response renders escaped
    assert response.status_code in (400, 422) or '<script>' not in response.body
```

### Fuzz target

```python
@given(payload=sampled_from(SQLI_PAYLOADS))
def test_search_does_not_execute_sql(payload):
    response = search(query=payload)
    # Should never expose DB state
    assert "syntax error" not in response.body.lower()
    assert response.status_code in (200, 400)
```

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Treating XSS payloads as "stored examples" without checking response shape | A test that just sends and ignores response misses the actual vulnerability. | Always assert: payload is rejected OR rendered escaped. |
| Running these against production                             | Even synthetic-looking payloads may trip WAFs / alerts; risk to oncall. | Always against staging / local; document with the security team if production fuzzing is required. |
| Shipping these payloads in production seed data              | Real users see the strings; possible inadvertent execution.       | Synthetic-PII fixtures (per [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md)) for prod-shape; this catalog only for tests. |
| Skipping Unicode confusables                                 | Most-overlooked class; a `аdmin` (Cyrillic а) may bypass an admin-name allowlist. | Include confusables in any test against an identity allowlist. |
| Hand-rolling new payloads from blogs                         | Stale; misses encoded variants; misses platform-specific cases.  | Maintain this catalog; review against the OWASP Cheat Sheet Series quarterly. |

## Defensive guidance

For each class, the canonical mitigation:

| Class            | Mitigation                                                    |
|------------------|---------------------------------------------------------------|
| SQLi             | Parameterized queries; never string concat. ORM use is fine if you don't fall back to raw SQL. |
| XSS              | Output encoding per context (HTML / JS / CSS / URL); CSP nonces. |
| SSRF             | URL allowlist; reject internal IP ranges (RFC 1918, 169.254.x); per-domain rate limit. |
| Path traversal   | Canonicalize paths; assert resolved path is under the allowed root. |
| Command injection | Avoid `exec`/`system` with user input; use `argv` arrays not strings. |
| XXE              | Disable DTD processing in the XML parser. |
| Prototype pollution | `Object.create(null)` for user-data objects; `--disable-proto` Node flag. |
| ReDoS            | Use linear-time regex engines (re2); set timeouts. |
| Unicode confusables | NFKC-normalize before comparison; reject mixed-script identifiers. |
| Header injection | Strip `\r\n` from header values; use a header library that does this for you. |

## References

- [owasp-top-10][owasp] - canonical attack-class reference.
- [cwe-top-25][cwe] - CWE Top 25 most-dangerous weaknesses.
- OWASP Cheat Sheet Series - https://cheatsheetseries.owasp.org/
- Unicode confusables - https://www.unicode.org/Public/security/latest/confusables.txt
- [`negative-test-generator`](../negative-test-generator/SKILL.md) - sibling skill that generates rejection-path tests; consumes
  this catalog as input.
- [`threat-model-from-spec`](../../../qa-shift-left/agents/threat-model-from-spec.md) - upstream agent that identifies which payload classes apply to
  a given feature.
