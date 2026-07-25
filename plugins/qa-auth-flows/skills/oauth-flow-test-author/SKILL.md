---
name: oauth-flow-test-author
description: "Build-an-X for OAuth 2.0 / OIDC flow tests - authorization-code with PKCE per RFC 7636 (canonical for browser/native/mobile clients), client-credentials per RFC 6749 §1.3.4 (M2M), refresh-token rotation per RFC 9700 (token-binding + reuse-detection), state parameter for CSRF defense per RFC 6749 §10.12, nonce parameter for OIDC ID-token replay defense, scope-grant verification, redirect-URI strict matching. Use when authoring tests for any OAuth/OIDC client or resource server, regardless of the underlying IdP (Keycloak / Auth0 / Okta / mock)."
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

This skill is the per-flow test recipe. The canonical authorization-code +
PKCE flow is authored end to end in the Worked example below; the
less-common grants and negative cases live in
[references/per-flow-test-recipes.md](references/per-flow-test-recipes.md).

## When to use

- Authoring tests for an OAuth 2.0 / OIDC client (web, mobile,
  SPA, M2M).
- Reviewing PRs that touch auth-flow code.
- The team needs flow-coverage independent of the IdP choice
  (Keycloak / Auth0 / Okta / mock).

## How to use

1. Identify the grant(s) the client uses from the flow-selection table below.
2. Author the authorization-code + PKCE happy path (the Worked example) - the canonical flow for browser / native / mobile clients.
3. Add the negative and secondary-grant tests each client needs (state CSRF, client-credentials, refresh-token rotation, OIDC nonce, scope-downgrade, redirect-URI) from [references/per-flow-test-recipes.md](references/per-flow-test-recipes.md).
4. Run the end-to-end coverage checklist for every OAuth/OIDC client in scope.

## Flow-selection decision surface

| Client type | Grant to test | Required tests | Recipe |
|---|---|---|---|
| Browser / SPA / native / mobile | Authorization Code + PKCE (S256) | Happy path + state CSRF + redirect-URI + (OIDC nonce if `openid`) | Worked example + references |
| Machine-to-machine (M2M) | Client Credentials | Happy path; assert no `refresh_token` | references |
| Any client holding a refresh token | Refresh Token | Rotation + reuse-detection | references |
| Any OIDC client | Authorization Code + ID Token | Nonce match + scope-downgrade | Worked example + references |
| Legacy Implicit / RO-Password | (none - deprecated per RFC 9700) | Migrate to Auth Code + PKCE | - |

## Worked example - authorization-code + PKCE (canonical)

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

The happy path asserts the returned `state` matches; the negative
state-mismatch test, plus the client-credentials, refresh-rotation,
OIDC-nonce, scope-downgrade, and redirect-URI recipes, are in
[references/per-flow-test-recipes.md](references/per-flow-test-recipes.md).

## End-to-end coverage checklist

For each OAuth/OIDC client in scope:

1. Auth-code + PKCE happy path (Worked example)
2. State parameter validation (references)
3. Client-credentials happy path (if M2M; references)
4. Refresh-token rotation + reuse detection (references)
5. OIDC nonce validation (if OIDC; references)
6. Scope-downgrade handling (references)
7. Redirect-URI strict matching (references)
8. Token expiration handling (use-after-expiry returns 401)
9. Token revocation (RFC 7009) if endpoint supports it

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use PKCE `plain` method | Defeats PKCE; RFC 7636 §4.2 specifies S256 as recommended | Always S256 (Worked example) |
| Skip state validation in the callback handler | CSRF vulnerable | State CSRF negative test (references) |
| Hardcode redirect_uri prefix matching | Substring match accepts evil URIs | Strict equality (references) |
| Test only the happy path | Negative cases (mismatched state, invalid PKCE, expired token) untested | Negative tests (references) |
| Use Implicit or RO-Password grants in new code | Deprecated per RFC 9700 | Auth Code + PKCE |

## Limitations

- This is a build-an-X workflow. Tests use the application's HTTP
  client + browser automation library; this skill is the per-flow
  checklist.
- IdP-specific quirks (audience, custom auth servers, sign-in
  policies) layer on top - see `keycloak-tests`,
  `auth0-tests`,
  `okta-tests` for IdP-specific patterns.
- RFC 9700 supersedes earlier security BCPs; pin to the latest
  version when authoring tests.
- OAuth 2.1 (in-progress) consolidates the deprecations from RFC
  9700; prefer 2.1 patterns when the IdP supports them.

## References

- [rfc6749][rfc6749] - RFC 6749 OAuth 2.0 Authorization Framework
- [rfc7636][rfc7636] - RFC 7636 PKCE
- IETF RFC 9700 - OAuth 2.0 Security Best Current Practice (March 2025)
- IETF RFC 7009 - OAuth 2.0 Token Revocation
- openid.net/specs/openid-connect-core-1_0.html - OIDC Core spec
- [references/per-flow-test-recipes.md](references/per-flow-test-recipes.md) - state CSRF, client-credentials, refresh-token rotation, OIDC nonce, scope-downgrade, and redirect-URI recipes.
- `keycloak-tests`,
  `auth0-tests`,
  `okta-tests` - IdP-specific patterns
- `session-management-test-author` - companion: post-auth session lifecycle
