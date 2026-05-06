---
name: oauth-flow-test-author
description: Build-an-X for OAuth 2.0 / OIDC flow tests — authorization-code with PKCE per RFC 7636 (canonical for browser/native/mobile clients), client-credentials per RFC 6749 §1.3.4 (M2M), refresh-token rotation per RFC 9700 (token-binding + reuse-detection), state parameter for CSRF defense per RFC 6749 §10.12, nonce parameter for OIDC ID-token replay defense, scope-grant verification, redirect-URI strict matching. Use when authoring tests for any OAuth/OIDC client or resource server, regardless of the underlying IdP (Keycloak / Auth0 / Okta / mock).
rating: 24
d6: 5
archetype: S3
---

# oauth-flow-test-author

## Overview

OAuth 2.0 (RFC 6749) defines four grant types per [datatracker.ietf.org/doc/html/rfc6749][rfc6749]:

[rfc6749]: https://datatracker.ietf.org/doc/html/rfc6749

> "1. **Authorization Code** (§1.3.1): The authorization code is
>    obtained by using an authorization server as an intermediary
>    between the client and resource owner.
> 2. **Implicit** (§1.3.2): The implicit grant is a simplified
>    authorization code flow optimized for clients implemented in a
>    browser using a scripting language such as JavaScript.
> 3. **Resource Owner Password Credentials** (§1.3.3): The resource
>    owner password credentials (i.e., username and password) can
>    be used directly as an authorization grant to obtain an access
>    token.
> 4. **Client Credentials** (§1.3.4): The client credentials can be
>    used as an authorization grant when the authorization scope is
>    limited to protected resources under the control of the
>    client."

**Per RFC 9700 (OAuth 2.0 Security Best Current Practice, March 2025):**
- Implicit grant is **deprecated**.
- Resource Owner Password Credentials grant is **deprecated**.
- Authorization Code with PKCE (per [datatracker.ietf.org/doc/html/rfc7636][rfc7636])
  is the canonical flow for **all** clients, public or confidential.

[rfc7636]: https://datatracker.ietf.org/doc/html/rfc7636

This skill is the per-flow test recipe.

## When to use

- Authoring tests for an OAuth 2.0 / OIDC client (web, mobile,
  SPA, M2M).
- Reviewing PRs that touch auth-flow code.
- The team needs flow-coverage independent of the IdP choice
  (Keycloak / Auth0 / Okta / mock).

## Step 1 — Authorization-code flow with PKCE (canonical)

Per RFC 6749 §4.1 (per [rfc6749][rfc6749]) the flow:

1. Client directs resource owner to **authorization endpoint** with
   `client_id`, `redirect_uri`, `response_type=code`, `scope`,
   `state` (RECOMMENDED for CSRF defense per §10.12), `nonce`
   (OIDC), and PKCE params (`code_challenge` + `code_challenge_method`).
2. Authorization server authenticates the resource owner.
3. Server redirects back to client with the authorization code +
   the original `state`.
4. Client requests **token endpoint** with `grant_type=authorization_code`,
   `code`, `redirect_uri`, `client_id`, and PKCE `code_verifier`.
5. Server returns access token (+ refresh token + ID token if OIDC).

**PKCE per RFC 7636 §4.2** ([rfc7636][rfc7636]):

> "Two methods are defined:
> - **plain:** `code_challenge = code_verifier`
> - **S256:** `code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))`"

Always use **S256**; `plain` defeats the purpose of PKCE.

**Test pattern (Python with requests + Playwright for browser flow):**

```python
import secrets, hashlib, base64, requests
from urllib.parse import urlparse, parse_qs

def make_pkce_pair():
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    return verifier, challenge

def test_authz_code_pkce_flow(idp_url, client_id, redirect_uri, browser):
    verifier, challenge = make_pkce_pair()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)

    # Step 1: redirect to authorize endpoint
    authz_url = (
        f"{idp_url}/authorize?"
        f"client_id={client_id}&response_type=code&"
        f"redirect_uri={redirect_uri}&scope=openid+profile&"
        f"state={state}&nonce={nonce}&"
        f"code_challenge={challenge}&code_challenge_method=S256"
    )
    # Browser interaction (simulated via Playwright):
    page = browser.new_page()
    page.goto(authz_url)
    page.fill("#username", "alice")
    page.fill("#password", "alicepass")
    page.click("#submit")

    # Step 3: redirect lands on redirect_uri with code + state
    redirected_to = page.url
    parsed = urlparse(redirected_to)
    query = parse_qs(parsed.query)
    assert query["state"][0] == state    # RFC §10.12 CSRF defense
    code = query["code"][0]

    # Step 4: token endpoint
    token_response = requests.post(
        f"{idp_url}/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "code_verifier": verifier,    # PKCE proof
        },
    )
    assert token_response.status_code == 200
    body = token_response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"
```

## Step 2 — State parameter CSRF defense

Per RFC 6749 §4.1.1 ([rfc6749][rfc6749]):

> "An opaque value used by the client to maintain state between the
> request and callback...should be used for preventing cross-site
> request forgery as described in Section 10.12."

**Test the negative case:**

```python
def test_state_mismatch_rejected(client):
    state = "expected-state"
    # ... initiate flow with state=expected-state ...
    # Simulate IdP redirect with WRONG state:
    callback_response = client.get(f"{redirect_uri}?code=valid-code&state=wrong-state")
    assert callback_response.status_code in [400, 403]
```

If the client accepts the redirect without state validation, mark
**critical** finding (CSRF vulnerable).

## Step 3 — Client-credentials grant (M2M)

Per RFC 6749 §4.4. Test pattern:

```python
def test_client_credentials_grant(idp_url, client_id, client_secret, audience):
    response = requests.post(
        f"{idp_url}/token",
        auth=(client_id, client_secret),   # HTTP Basic per §2.3.1
        data={
            "grant_type": "client_credentials",
            "audience": audience,    # required by some IdPs (Auth0, Okta)
            "scope": "api:read",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert "access_token" in body
    # No refresh_token for client_credentials per §4.4.3
    assert "refresh_token" not in body
```

## Step 4 — Refresh-token rotation

Per RFC 9700: refresh tokens for public clients (browser/native)
should rotate on use — each refresh issues a new refresh token,
invalidating the old.

**Test pattern:**

```python
def test_refresh_token_rotates(idp_url, client_id, refresh_token):
    # First refresh
    r1 = requests.post(
        f"{idp_url}/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
        },
    )
    assert r1.status_code == 200
    new_refresh = r1.json()["refresh_token"]
    assert new_refresh != refresh_token   # rotated

    # Second refresh with NEW token works
    r2 = requests.post(
        f"{idp_url}/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": new_refresh,
            "client_id": client_id,
        },
    )
    assert r2.status_code == 200

    # Re-using the OLD refresh token fails (reuse detection)
    r3 = requests.post(
        f"{idp_url}/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,    # the original (now invalid)
            "client_id": client_id,
        },
    )
    assert r3.status_code == 400
```

If reuse-detection isn't enabled, mark **critical** — old tokens
remaining valid after rotation defeats the purpose.

## Step 5 — OIDC nonce + ID-token validation

For OIDC (Authorization Code + ID Token), validate the nonce in the
ID token matches what was sent in the authorize request. Defends
against ID-token replay.

```python
def test_id_token_nonce_matches(client, idp_url):
    nonce = secrets.token_urlsafe(32)
    # ... full code flow with nonce param ...
    id_token = token_response.json()["id_token"]
    decoded = jwt.decode(id_token, ...)   # verify signature too
    assert decoded["nonce"] == nonce
```

## Step 6 — Scope-grant verification

If client requests `openid profile email` but user only consents to
`openid profile`, the issued token must reflect the actual grant:

```python
def test_scope_downgrade(client):
    # Request 3 scopes, user grants 2:
    response = ... # access_token with consented scopes only
    assert response.json()["scope"] == "openid profile"   # email omitted
    # Resource server should reject email-scoped requests:
    api_response = requests.get(
        f"{api_url}/me/email",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert api_response.status_code == 403
```

## Step 7 — Redirect-URI strict matching

Per RFC 9700: redirect URIs MUST match exactly, not by substring or
regex. Tests:

```python
def test_redirect_uri_mismatch_rejected(idp_url, client_id):
    response = requests.get(
        f"{idp_url}/authorize",
        params={
            "client_id": client_id,
            "redirect_uri": "https://evil.example.com/callback",  # NOT registered
            "response_type": "code",
        },
    )
    # IdP should reject; the response renders an error page, NOT a redirect:
    assert "evil.example.com" not in response.url
    assert response.status_code in [400, 403]
```

## Step 8 — End-to-end test recipe

For each OAuth/OIDC client in scope:

1. ✅ Auth-code + PKCE happy path (Step 1)
2. ✅ State parameter validation (Step 2)
3. ✅ Client-credentials happy path (if M2M; Step 3)
4. ✅ Refresh-token rotation + reuse detection (Step 4)
5. ✅ OIDC nonce validation (if OIDC; Step 5)
6. ✅ Scope-downgrade handling (Step 6)
7. ✅ Redirect-URI strict matching (Step 7)
8. ✅ Token expiration handling (use-after-expiry returns 401)
9. ✅ Token revocation (RFC 7009) if endpoint supports it

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use PKCE `plain` method | Defeats PKCE; RFC 7636 §4.2 specifies S256 as recommended | Always S256 (Step 1) |
| Skip state validation in the callback handler | CSRF vulnerable | Step 2 negative test |
| Hardcode redirect_uri prefix matching | Substring match accepts evil URIs | Strict equality (Step 7) |
| Test only the happy path | Negative cases (mismatched state, invalid PKCE, expired token) untested | Steps 2–7 negative tests |
| Use Implicit or RO-Password grants in new code | Deprecated per RFC 9700 | Auth Code + PKCE |

## Limitations

- This is a build-an-X workflow. Tests use the application's HTTP
  client + browser automation library; this skill is the per-flow
  checklist.
- IdP-specific quirks (audience, custom auth servers, sign-in
  policies) layer on top — see [`keycloak-tests`](../keycloak-tests/SKILL.md),
  [`auth0-tests`](../auth0-tests/SKILL.md),
  [`okta-tests`](../okta-tests/SKILL.md) for IdP-specific patterns.
- RFC 9700 supersedes earlier security BCPs; pin to the latest
  version when authoring tests.
- OAuth 2.1 (in-progress) consolidates the deprecations from RFC
  9700; prefer 2.1 patterns when the IdP supports them.

## References

- [rfc6749][rfc6749] — RFC 6749 OAuth 2.0 Authorization Framework
- [rfc7636][rfc7636] — RFC 7636 PKCE
- IETF RFC 9700 — OAuth 2.0 Security Best Current Practice (March 2025)
- IETF RFC 7009 — OAuth 2.0 Token Revocation
- openid.net/specs/openid-connect-core-1_0.html — OIDC Core spec
- [`keycloak-tests`](../keycloak-tests/SKILL.md),
  [`auth0-tests`](../auth0-tests/SKILL.md),
  [`okta-tests`](../okta-tests/SKILL.md) — IdP-specific patterns
- [`session-management-test-author`](../session-management-test-author/SKILL.md)
  — companion: post-auth session lifecycle
