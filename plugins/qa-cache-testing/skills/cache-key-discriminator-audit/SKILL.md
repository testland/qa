---
name: cache-key-discriminator-audit
description: "Audits whether a cache key carries every discriminator the cached response actually depends on, so two requests that must not share a slot cannot collide. Ranks identity discriminators (tenant, user, authorization scope, plan tier) above presentation ones (locale, region, currency, feature flag), maps each missing discriminator to the data-exposure or wrong-content consequence it causes, classifies each key-and-value pair into a critical / high / medium severity band (including the Python lru_cache-on-an-instance-method trap), and writes the fix as a namespaced key builder plus the matching HTTP Vary header. Use when a cache key is being designed or changed, when a per-user or per-tenant response is about to be stored in a shared cache or CDN, or when investigating a report that one user or tenant saw another's data."
---

# cache-key-discriminator-audit

## The defect this finds

A cache key is a function of an operation plus a set of
**discriminators**: the request dimensions the response body actually
varies on. If the response varies on something the key does not carry,
two different requests hash to the same slot and the second requester
is served the first requester's response.

The worst version of this is not slow, and it is not stale. It is a
**data-exposure defect**: one user's data served to another user. A
missing `tenant_id` in a multi-tenant cache is a confidentiality bug
with the same blast radius as a missing authorization check, because
the cache is doing the serving and the authorization code never runs
on the second request. Triage it as a security defect, not as a
performance or freshness issue.

The exposure only reaches other people when the cache is shared. RFC
9111 §1 splits caches into a **shared cache** (stores responses for
reuse by more than one user) and a **private cache** (dedicated to a
single user)
([RFC 9111 §1](https://www.rfc-editor.org/rfc/rfc9111.html)). A CDN,
a reverse proxy, and a Redis or Memcached instance behind the
application are all shared caches. A missing discriminator in any of
them is a cross-user defect. The same omission in a browser cache is
a correctness bug affecting one person.

Two named web-security classes sit on top of this. Web cache
poisoning manipulates cache keys to inject malicious content served to
other users; web cache deception tricks the cache into storing
sensitive content the attacker can then retrieve
([PortSwigger](https://portswigger.net/web-security/web-cache-deception)).
Poisoning is the attacker-controlled form of an under-specified key.
Deception is the attacker-controlled form of a response that should
never have been stored in a shared cache at all.

## Keyed and unkeyed inputs

The vocabulary to audit with comes from the cache's own point of
view. A cache identifies equivalent requests by a predefined subset of
the request's components, the **cache key** (typically the request
line plus `Host`); components left out of it are **unkeyed**
([PortSwigger](https://portswigger.net/web-security/web-cache-poisoning)).

So the audit reduces to one question per cached response:

> Is every input the response body depends on **keyed**?

An unkeyed input that changes the body is the defect. An unkeyed
input that cannot change the body is fine and should stay unkeyed,
because every added discriminator fragments the cache and lowers the
hit rate.

## The discriminator table

Identity and authorization discriminators come first. They are the
ones whose absence exposes data. Presentation discriminators come
after; their absence produces wrong content, which is a correctness
defect and not a disclosure.

| Class | Discriminator | Where it lives in a request | What happens when it is missing from the key |
|---|---|---|---|
| Identity | `tenant_id` / org / workspace | Subdomain, path segment, custom header, or claim inside the token | Tenant B is served tenant A's response. Cross-tenant data leak. |
| Identity | `user_id` / subject | Claim inside the session token or `Authorization` | User B is served user A's response. Per-user data leak. |
| Authorization | Credential presence and value | `Authorization` header, session cookie | A response built for an authenticated principal is stored and replayed to an anonymous or differently-scoped requester. This is the canonical shared-cache leak. |
| Authorization | Role / permission set | Derived from the token server-side | A low-privilege caller is served a response rendered with admin-visible fields. |
| Authorization | Plan or subscription tier | Derived from the tenant record | A free-tier caller is served paid-tier content, or a paid caller is served the upsell page. |
| Identity-adjacent | Impersonation / support-session context | Custom header set by an internal proxy | Support-session output is cached and served to the real end user, or the reverse. |
| Content negotiation | Locale | `Accept-Language`, cookie, path prefix | Wrong-language body. Also wrong pluralization and wrong legal copy. |
| Content negotiation | Currency | Derived from tenant, geo, or explicit selector | Prices rendered in the wrong currency, with the numeric amount unchanged. |
| Content negotiation | Region / geo routing | CDN geo header, client IP | Geo-restricted content served outside its region. |
| Content negotiation | `Accept-Encoding` | `Accept-Encoding` header | A gzip body served to a client that cannot decode it. |
| Content negotiation | Device class / breakpoint | `User-Agent`, client hints | Mobile markup served to desktop and back. |
| Content shape | Feature flag / experiment bucket | Cookie, header, or server-side assignment | Variant B cached and served to the whole control group, destroying the experiment and shipping unreleased UI. |
| Content shape | API or schema version | Path segment, `Accept` media type, custom header | v1 body decoded by a v2 client. |
| Content shape | Pagination cursor and page size | Query string | Page N served in place of page M. |
| Content shape | Sort, filter, and search parameters | Query string | A filtered list served to an unfiltered request. |
| Content shape | Time bucket for time-relative bodies | Server clock | "Expires in 3 minutes" frozen at the value it had when first cached. |

Read the table as a checklist against one concrete response. For each
row, answer keyed, unkeyed-and-irrelevant, or unkeyed-and-relevant.
Only the third answer is a finding.

## Deriving the required discriminator set

1. **Pin the response, not the endpoint.** One route can produce
   several response shapes. Audit each shape separately.
2. **List every field in the response body.** For each field, name
   what it was derived from: a path parameter, a query parameter, a
   header, a token claim, a database row scoped by tenant, or a
   server-side flag lookup.
3. **Promote every derivation source to a candidate discriminator.**
   A field derived from a token claim makes that claim a candidate
   even though the claim never appears in the URL.
4. **Compare the candidate set to the key.** Write both out
   literally. The key is whatever the code concatenates, or for HTTP
   the request line plus `Host` plus whatever the `Vary` field
   nominates.
5. **Classify each gap** using the severity bands below.
6. **Check the tier.** Confirm whether the cache holding this
   response is shared or private. A gap in a shared cache is a
   disclosure finding; the same gap in a private cache is a
   correctness finding one band lower.

## Severity classification

The three bands below are a **practitioner convention** for triage
order, not a standard. What is standardized is the underlying
behavior each row cites.

| Pattern | Band | Why |
|---|---|---|
| Key is path and arguments only; response body contains fields scoped to a tenant | critical | Cross-tenant disclosure. Every tenant sharing that path shares one slot. |
| Key is path and arguments only; response body contains fields scoped to a user | critical | Per-user disclosure. |
| Response is stored in a shared cache and was built from a credential, with neither `private` nor a credential in the key | critical | The next requester with no credential is served the authenticated body. |
| Key includes `user_id` but not `tenant_id`, and user identifiers are allocated per tenant rather than globally | critical | Two tenants both have a user numbered 1. They share a slot. Downgrade to informational only after confirming identifiers are globally unique, such as UUIDs. |
| Key is complete, but the response is served through a shared cache with no `Vary` naming the headers the body varied on | high | The application key is right and the intermediary's key is wrong. The leak happens upstream of the code you audited. |
| Key includes tenant and user but omits role, permission set, or plan tier, and the body renders differently per role | high | Privilege-scoped fields cross a privilege boundary within one tenant. |
| `functools.lru_cache` applied to an instance method on a class that defines value-based equality | high | See the trap below. Two distinct instances that compare equal share one slot. |
| `functools.lru_cache` applied to an instance method on any class | medium | The class-level cache holds a strong reference to every `self` it has seen. Request-scoped objects outlive their request. |
| Key omits locale, currency, region, or device class where the body varies on them | medium | Wrong content, no disclosure. |
| Memoized function receives a mutable object as an argument | medium | The entry is keyed on the object as it was at insertion; later mutation is not reflected. Depends on the object being hashable at all. |
| Key omits a dimension that is currently constant but is on the roadmap to vary | low | Not yet a defect. Record it so the key changes when the dimension does. |

## The lru_cache-on-an-instance-method trap

`functools.lru_cache` on an instance method stores entries at the
**class level**, keyed on the whole argument tuple including `self`
([functools docs](https://docs.python.org/3/library/functools.html)).
The folk description ("`self` is not in the key, so all instances
share one entry") is wrong, and the real mechanism changes the fix.
Whether two instances collide depends entirely on how `self` hashes:

- **Default classes do not collide.** User-defined instances hash from
  their `id()`, so each gets its own entries. The defect here is
  retention, not collision: the class-level cache pins every
  request-scoped `self` until it ages out of `maxsize`.
- **Value-equality classes do collide.** A frozen dataclass, an attrs
  class, or any hand-written `__eq__`/`__hash__` opts into value-based
  hashing. If the equality fields omit the tenant, tenant A's and
  tenant B's objects hash equal and share every entry - a genuine
  cross-tenant collision, invisible in the key expression because it
  happens inside `__hash__`.

Fix, in order of preference: (1) do not cache on the instance - make it
a module-level function taking the discriminators as explicit
arguments; (2) use `functools.cached_property` for a no-argument
per-instance value, which stores at the instance level and is released
with the instance; (3) if it must stay cached and the class defines
value equality, add the missing discriminator to the equality fields.

Full mechanism and Python-doc citations:
[references/lru-cache-trap.md](references/lru-cache-trap.md).

## The fix recipe

### Part 1: a key builder, not a format string

Inline f-strings drift. Route every key through one builder so the
required discriminators cannot be forgotten, and so a grep for the
builder enumerates every cache site.

```python
def cache_key(*parts, tenant_id, user_id=None, locale=None, schema="v1"):
    """Namespaced cache key. tenant_id is mandatory and never defaulted."""
    if not tenant_id:
        raise ValueError("tenant_id is required for every cache key")
    segments = [f"s:{schema}", f"t:{tenant_id}"]
    if user_id is not None:
        segments.append(f"u:{user_id}")
    if locale is not None:
        segments.append(f"l:{locale}")
    segments.extend(str(p) for p in parts)
    return ":".join(segments)
```

Three properties earn their place:

- `tenant_id` is keyword-only and raises rather than defaulting.
  A silently absent tenant is exactly the defect being prevented.
- A schema segment lets a deploy that changes the response shape
  invalidate everything by bumping one constant, with no purge call.
- Optional discriminators are appended only when supplied, so
  responses that genuinely do not vary on locale keep a single entry.

### Part 2: the HTTP Vary header

For anything cached by a browser, proxy, or CDN, the key lives
outside your process and the only lever you have on it is `Vary`.
`Vary` nominates the request header fields used in content
negotiation; a shared cache uses them as a secondary key and MUST NOT
reuse a stored response without revalidation unless every nominated
field matches the original request
([RFC 9110 §12.5.5](https://www.rfc-editor.org/rfc/rfc9110.html),
[RFC 9111 §4.1](https://www.rfc-editor.org/rfc/rfc9111.html)).

```http
Cache-Control: private, max-age=300
Vary: Authorization, Accept-Language, X-Tenant-Id
```

Four consequences worth stating explicitly:

- **`Vary` nominates request header field names only.** A
  discriminator in a path segment or query string is already keyed
  through the request line. One carried nowhere in the request, such
  as a server-side experiment assignment, cannot be expressed in
  `Vary` at all - move it into a request header or stop caching the
  response in a shared cache.
- **`Vary: *` is not a safe catch-all.** It always fails to match, so
  it disables shared-cache reuse entirely rather than keying more
  finely.
- **`private` is the stronger control for credentialed responses.** It
  forbids a shared cache from storing the response at all;
  `Vary: Authorization` still stores the body, one entry per credential
  value. Prefer `private` when the body carries user data and reserve
  `Vary: Authorization` for responses genuinely reusable within a
  credential.
- **`private` is not confidentiality.** It only controls where the
  response may be stored, not who may read it - a cache-placement
  directive, not a protection.

A CDN that classifies by file suffix will store `/dashboard/x.css`
whatever your `Cache-Control` said; OWASP's remediation for that
path-confusion cache deception is to route on content-type rather than
extension or path. Full RFC and OWASP citations:
[references/http-cache-directives.md](references/http-cache-directives.md).

## Worked example

A dashboard endpoint in a multi-tenant product, where user
identifiers are allocated per tenant.

**Before:**

```python
def get_dashboard(user_id):
    key = f"dashboard:{user_id}"
    if cached := redis.get(key):
        return json.loads(cached)
    data = fetch_dashboard(current_tenant_id(), user_id)
    redis.set(key, json.dumps(data), ex=300)
    return data
```

Step 2 of the derivation: the body contains `org_name`,
`billing_plan`, and a `widgets` list, all read from rows scoped by
`current_tenant_id()`. Step 3 promotes `tenant_id` to a candidate.
Step 4 finds it unkeyed. Step 6 finds Redis is a shared cache.

Row 1 of the severity table applies: critical.

**After:**

```python
def get_dashboard(tenant_id, user_id, locale):
    key = cache_key("dashboard", tenant_id=tenant_id,
                    user_id=user_id, locale=locale)
    if cached := redis.get(key):
        return json.loads(cached)
    data = fetch_dashboard(tenant_id, user_id)
    redis.set(key, json.dumps(data), ex=300)
    return data
```

Key before: `dashboard:1`. Key after:
`s:v1:t:acme:u:1:l:en-GB:dashboard`. Tenant `globex` user 1 now
resolves to `s:v1:t:globex:u:1:l:en-GB:dashboard` and cannot land in
`acme`'s slot.

If the same payload is also served over HTTP through a CDN, the
response needs `Cache-Control: private, max-age=300` because the body
is per-user, and `Vary: Accept-Language` if the CDN is permitted to
store any variant of it at all.

## Output shape

Report one row per audited response, then expand every finding.

```markdown
## Cache-key discriminator audit: <scope>

| Response | Cache tier | Keyed | Unkeyed and relevant | Band |
|---|---|---|---|---|
| `GET /dashboard` | Redis (shared) | user_id | tenant_id, locale | critical |
| `GET /feed` | CDN (shared) | path | Authorization | critical |
| `Repo.load()` | in-process lru_cache | self, id | tenant (via __eq__) | high |

### Finding 1: `GET /dashboard` omits tenant_id

**Band:** critical (cross-tenant disclosure)
**Location:** `services/dashboard.py:31`
**Cache tier:** Redis, shared across all tenants
**Response fields that forced the discriminator:** org_name,
billing_plan, widgets[] (all tenant-scoped rows)
**Current key:** `dashboard:{user_id}`
**Required key:** `s:{schema}:t:{tenant_id}:u:{user_id}:dashboard`
**Fix:** route through the key builder; tenant_id keyword-only.
**Regression test:** request the endpoint as tenant A, then as tenant
B with the same numeric user id, and assert the two bodies differ on
org_name.
```

Close with the actions in band order, critical first, and pair every
critical finding with a regression test that would have caught it.
A key fix with no test that exercises two distinct principals against
the same slot is not finished.

## What this audit does not cover

This audit answers one question: does the key carry every
discriminator the response depends on? It deliberately excludes three
neighboring concerns that get confused with it.

- **Not invalidation.** Deciding when a correct entry becomes wrong,
  and how to remove it (purge APIs, surrogate-key tags, event-driven
  deletes, write-then-invalidate ordering) is a separate problem. A
  perfectly discriminated key can still serve stale data.
- **Not TTL policy.** How long an entry may live, how tiers layer
  their expiry, and whether stale-while-revalidate is acceptable are
  freshness decisions. This audit does not read a single `max-age`
  value except where the response should not have been stored in a
  shared cache at all.
- **Not a coherence protocol.** Keeping several tiers agreeing with
  each other and with the source of truth, and choosing between
  write-through, write-back, write-around, and cache-aside, is
  design work upstream of this. This audit takes the tiers as given
  and inspects the key each one computes.

If the symptom is "the data is old", it is invalidation or TTL. If
the symptom is "the data belongs to someone else", it is this.

## Limitations

- **Reading a key expression cannot prove hashing behavior.** The
  `lru_cache` value-equality collision lives in `__hash__` and
  `__eq__`, not in the key expression. Read the class definition, not
  just the decorator.
- **`Vary` is a request to the intermediary, not a guarantee.**
  Whether a given CDN honors every nominated header, and whether it
  normalizes or strips headers before computing its own key, is
  vendor behavior. Verify with a live two-principal request against
  the edge.
- **Server-side discriminators cannot be expressed in `Vary`.**
  Experiment buckets and role lookups assigned inside the
  application have no request header to nominate. Those responses
  need `private`, or a header the application sets on the way in.
- **The audit reports risk, not collision rate.** Measuring how often
  two principals actually land on one slot requires production
  tracing of key values, which is out of scope here.
