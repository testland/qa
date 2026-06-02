---
name: session-management-test-author
description: "Build-an-X for session management tests per OWASP ASVS V3 - cookie attribute coverage (Secure / HttpOnly / SameSite=Strict|Lax), session-fixation defense (regenerate session ID on login), absolute + idle timeout, concurrent-session limits, logout invalidation across devices, CSRF token handling, session-binding to TLS / IP / device fingerprint. Use when authoring tests for any web app's session layer, regardless of framework (Express session, Django sessions, Spring Security, ASP.NET, Rails, etc.)."
rating: 24
d6: 4
archetype: S3
---

# session-management-test-author

## Overview

Per [owasp.org/www-project-application-security-verification-standard][asvs]:

[asvs]: https://owasp.org/www-project-application-security-verification-standard/

> "The OWASP Application Security Verification Standard (ASVS)
> Project provides a basis for testing web application technical
> security controls and also provides developers with a list of
> requirements for secure development."

Per [asvs][asvs] the requirement format:

> "Each requirement has an identifier in the format
> `<chapter>.<section>.<requirement>`, where each element is a number.
> For example, `1.11.3`."

Plus the versioned form `v<version>-<chapter>.<section>.<requirement>`
(e.g., `v5.0.0-1.2.5`) for stability across releases.

This skill is a build-an-X workflow targeting **ASVS V3 (Session
Management)** - the chapter that defines session-layer security
requirements. Tests verify cookie attributes, timeout behavior,
session-ID regeneration, and logout semantics.

## When to use

- Authoring tests for any web app with sessions (cookie-based or
  token-based).
- Reviewing PRs that touch login / logout / session middleware.
- A security audit cites ASVS V3 as a target.
- Compliance program (SOC 2, ISO 27001) requires evidence of
  session-management testing.

## Step 1 - Cookie attribute baseline

Every session cookie MUST set:

| Attribute | Required value | Why |
|---|---|---|
| `Secure` | true (in production) | Prevents transmission over plaintext HTTP |
| `HttpOnly` | true | Prevents JavaScript access (XSS impact reduction) |
| `SameSite` | `Strict` or `Lax` | CSRF defense |
| `Path` | scope to app root or narrower | Limits cookie exposure |
| `Domain` | NOT a parent domain (avoid subdomain leak) | Limits cookie exposure |
| `Max-Age` or `Expires` | finite (absolute timeout) | Session can't outlive intended lifetime |

**Test pattern (Python with requests):**

```python
def test_session_cookie_has_all_required_attributes(client, base_url):
    response = client.post(f"{base_url}/login", data={"user": "alice", "pass": "alicepass"})

    set_cookie = response.headers.get("Set-Cookie", "")
    assert "Secure" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "SameSite=Strict" in set_cookie or "SameSite=Lax" in set_cookie
    assert ("Max-Age" in set_cookie) or ("Expires" in set_cookie)

    # Domain attribute should NOT include parent domain:
    if "Domain=" in set_cookie:
        domain = set_cookie.split("Domain=")[1].split(";")[0]
        assert not domain.startswith(".")   # no leading-dot (parent domain)
```

**Default: `SameSite=Strict`** - provides the strongest CSRF defense by blocking the cookie on all cross-site requests. Use `SameSite=Lax` only when the session must survive OAuth callback redirects or other top-level cross-site navigations.

## Step 2 - Session-fixation defense

When a user logs in, the session ID MUST change. Otherwise an
attacker who set a known session ID on the victim's browser can
hijack the post-login session.

**Test pattern:**

```python
def test_session_id_regenerates_on_login(client, base_url):
    # Pre-login: visit homepage, get session cookie
    pre_login = client.get(f"{base_url}/")
    sid_before = parse_cookie(pre_login, "sessionid")

    # Login (carry the pre-login cookie)
    client.post(
        f"{base_url}/login",
        data={"user": "alice", "pass": "alicepass"},
        cookies={"sessionid": sid_before},
    )

    # Post-login: session ID must differ
    sid_after = parse_cookie(client.get(f"{base_url}/dashboard"), "sessionid")
    assert sid_after != sid_before
```

If the test fails (session ID unchanged), mark **critical**:
session-fixation vulnerability.

## Step 3 - Absolute + idle timeout

Two timeout dimensions:

- **Absolute timeout**: maximum session lifetime regardless of
  activity (e.g., 8 hours). Common for high-security apps.
- **Idle timeout**: session expires after N minutes of inactivity
  (e.g., 30 minutes).

Either alone is insufficient - both should be enforced.

**Test pattern:**

```python
def test_idle_timeout(client, base_url, freezer):
    freezer.move_to("2026-05-06 09:00:00")
    client.login("alice", "alicepass")

    # Activity 5 minutes later: still works
    freezer.tick(timedelta(minutes=5))
    assert client.get(f"{base_url}/dashboard").status_code == 200

    # No activity for 31 min: should expire
    freezer.tick(timedelta(minutes=31))
    response = client.get(f"{base_url}/dashboard")
    assert response.status_code == 401   # or redirects to login

def test_absolute_timeout(client, base_url, freezer):
    freezer.move_to("2026-05-06 09:00:00")
    client.login("alice", "alicepass")

    # Continuous activity should NOT extend beyond absolute limit
    for _ in range(8 * 6):    # 8 hours of activity, 10-min intervals
        freezer.tick(timedelta(minutes=10))
        client.get(f"{base_url}/dashboard")

    # 8h elapsed: even with continuous activity, session expires
    freezer.tick(timedelta(minutes=1))
    assert client.get(f"{base_url}/dashboard").status_code == 401
```

## Step 4 - Concurrent-session limits

Some apps limit users to N concurrent sessions (e.g., banking apps
limit to 1). Tests:

```python
def test_concurrent_session_limit(client_a, client_b, base_url):
    client_a.login("alice", "alicepass")
    client_b.login("alice", "alicepass")   # second session

    # Per app config: either client_a's session is revoked, OR the
    # second login is rejected. Document the policy + test it:
    response_a = client_a.get(f"{base_url}/dashboard")
    response_b = client_b.get(f"{base_url}/dashboard")

    if app_policy == "single_session":
        assert response_a.status_code == 401   # a was revoked
        assert response_b.status_code == 200
    elif app_policy == "limited_concurrent":
        # both work; assert correct behavior
        ...
```

## Step 5 - Logout invalidation across devices

When a user logs out from one device, all their sessions on that
device must be invalidated. Bonus: server-side invalidation (vs
just clearing the cookie client-side) prevents replay.

**Test pattern:**

```python
def test_logout_server_side_invalidation(client, base_url):
    client.login("alice", "alicepass")
    cookie_value = client.cookies.get("sessionid")
    client.post(f"{base_url}/logout")

    # Replay the cookie value:
    response = requests.get(
        f"{base_url}/dashboard",
        cookies={"sessionid": cookie_value},
    )
    assert response.status_code == 401
```

If the replay succeeds, the server is only clearing the client
cookie - **critical** finding for high-security apps.

For multi-device logout:

```python
def test_logout_all_devices_invalidates_other_sessions(client_a, client_b, base_url):
    # alice logs in on two devices
    client_a.login("alice", "alicepass")
    client_b.login("alice", "alicepass")

    # alice triggers "logout from all devices" on client_a
    client_a.post(f"{base_url}/account/logout-all")

    # Both sessions must be dead
    assert client_a.get(f"{base_url}/dashboard").status_code == 401
    assert client_b.get(f"{base_url}/dashboard").status_code == 401
```

## Step 6 - CSRF token handling

For cookie-based sessions, every state-changing endpoint should
require a CSRF token (or use SameSite=Strict cookies, which
provides similar guarantees).

**Test pattern:**

```python
def test_csrf_token_required(client, base_url):
    client.login("alice", "alicepass")
    # Request without CSRF token
    response = client.post(f"{base_url}/transfer", json={"to": "bob", "amount": 100})
    assert response.status_code in [403, 419]   # CSRF rejection

def test_csrf_token_per_session(client, base_url):
    client.login("alice", "alicepass")
    # Get the CSRF token via the standard endpoint
    csrf_response = client.get(f"{base_url}/api/csrf")
    token = csrf_response.json()["token"]

    response = client.post(
        f"{base_url}/transfer",
        json={"to": "bob", "amount": 100},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 200
```

## Step 7 - Session binding (defense-in-depth)

For high-security apps, bind sessions to additional context.

**Default: User-Agent + device-fingerprint binding** - strikes the best balance of attack surface reduction vs. false positives on legitimate user activity. Use TLS binding (RFC 8473) when the deployment controls both client and server and requires maximum strength; use IP binding only when the threat model accepts mobile-network churn (frequent re-auth on roaming).

These are policy decisions; test pattern verifies the chosen
binding holds:

```python
def test_session_bound_to_user_agent(client, base_url):
    client.login("alice", "alicepass", user_agent="Mozilla/5.0 ...")
    cookie_value = client.cookies.get("sessionid")

    response = requests.get(
        f"{base_url}/dashboard",
        cookies={"sessionid": cookie_value},
        headers={"User-Agent": "Different-UA"},   # different UA
    )
    assert response.status_code == 401   # if UA-binding is enforced
```

## Step 8 - End-to-end test recipe

For each app's session layer:

1. ✅ Cookie attributes (Step 1)
2. ✅ Session-fixation defense (Step 2)
3. ✅ Idle timeout (Step 3)
4. ✅ Absolute timeout (Step 3)
5. ✅ Concurrent-session policy enforced (Step 4)
6. ✅ Logout = server-side invalidation (Step 5)
7. ✅ Logout-all-devices works (Step 5)
8. ✅ CSRF token required for state-changing endpoints (Step 6)
9. ✅ Session binding per threat model (Step 7)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip Set-Cookie attribute test | Sessions transmitted insecurely; XSS-stealable cookies | Step 1 baseline |
| Logout = clear cookie only (no server-side invalidation) | Cookie replay continues to work | Step 5 negative test |
| Same session ID before + after login | Session-fixation vulnerable | Step 2 regenerate test |
| No absolute timeout | Sessions live forever; account-takeover blast radius huge | Step 3 |
| State-changing GET requests | Always vulnerable to CSRF | Convert to POST + CSRF token (Step 6) |

## Limitations

- This is a build-an-X workflow targeting cookie-based sessions
  primarily. JWT-based stateless sessions have a different
  attack-surface model - see [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md).
- ASVS V3 evolves per major version (current: v5.0.0); cite the
  pinned version in your test assertions.
- Some defenses (TLS binding, device fingerprinting) require server
  + client coordination; tests verify the server side; client
  conformance is separate.
- Federated SSO sessions (Keycloak / Auth0 / Okta) layer their own
  session-management on top - see those skills for IdP-specific
  patterns.

## References

- [asvs][asvs] - OWASP ASVS landing
- owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet - OWASP Session Management Cheat Sheet (companion to ASVS V3)
- IETF RFC 6265 - HTTP State Management Mechanism (cookies)
- IETF RFC 8473 - Token Binding over HTTP
- developer.mozilla.org/en-US/docs/Web/HTTP/Cookies - MDN cookie reference
- [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md) - 
  companion: pre-session auth flow
- [`keycloak-tests`](../keycloak-tests/SKILL.md),
  [`auth0-tests`](../auth0-tests/SKILL.md),
  [`okta-tests`](../okta-tests/SKILL.md) - IdP-specific session
  patterns (federated SSO)
