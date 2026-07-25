# RFC 9111 HTTP caching directives

Deep reference for `cache-coherence-patterns-reference` SKILL.md. Consult
when designing the `Cache-Control`, `Vary`, and `ETag` contract that the
browser and CDN tiers enforce.

Per [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html):

## Response directives (server → cache)

| Directive | RFC ref | Meaning |
|---|---|---|
| `max-age=N` | §5.2.2.1 | "The response is to be considered stale after its age is greater than the specified number of seconds." |
| `s-maxage=N` | §5.2.2.10 | "For a shared cache, the maximum age specified by this directive overrides... max-age." |
| `no-cache` | §5.2.2.4 | "The response MUST NOT be used to satisfy any other request without forwarding it for validation." |
| `no-store` | §5.2.2.5 | "A cache MUST NOT store any part of either the immediate request or the response." |
| `must-revalidate` | §5.2.2.2 | "Once the response has become stale, a cache MUST NOT reuse that response... until it has been successfully validated." |
| `private` | §5.2.2.7 | "A shared cache MUST NOT store the response (intended for a single user)." |
| `public` | §5.2.2.9 | "A cache MAY store the response even if it would otherwise be prohibited." |
| `immutable` | RFC 8246 | Response body will not change for the lifetime of the URL. Browsers skip revalidation. |

Per RFC 9111 §4.2.4: "A cache MUST NOT generate a stale
response unless it is disconnected or doing so is explicitly
permitted by the client or origin server." This is the formal
basis for stale-while-revalidate per
`stale-while-revalidate-reference`.

## Vary - the cache key

Per RFC 9111 §4.1: "When a cache receives a request that can be
satisfied by a stored response and that stored response contains
a Vary header field, the cache MUST NOT use that stored response
without revalidation unless all the presented request header
fields nominated by that Vary field value match those fields in
the original request."

Practical: `Vary: Accept-Encoding, Authorization` means
"separate cache entries per (Accept-Encoding, Authorization)
combination." Missing `Vary: Authorization` is the canonical
cross-tenant cache leak per
`cross-tenant-data-leak-tests`
Test 10.

## ETag + If-None-Match revalidation

Per RFC 9111 §4.3.1: "Another validator is the entity tag given
in an ETag field. One or more entity tags can be used in an
If-None-Match header field for response validation."

Pattern: server returns `ETag: "abc123"`; client sends
`If-None-Match: "abc123"`; server returns `304 Not Modified` or
`200 OK` with new ETag. Bandwidth-efficient but doesn't help
latency (still a round-trip).

## Sources

- RFC 9111 HTTP Caching:
  [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html).
- RFC 8246 `immutable`:
  [www.rfc-editor.org/rfc/rfc8246.html](https://www.rfc-editor.org/rfc/rfc8246.html).
