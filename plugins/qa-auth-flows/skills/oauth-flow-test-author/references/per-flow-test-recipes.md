# OAuth 2.0 / OIDC per-flow test recipes

Deep reference for `oauth-flow-test-author` SKILL.md. Consult when the client
uses a grant beyond the canonical authorization-code + PKCE flow shown in the
SKILL's Worked example, or needs the negative-case recipes for state,
refresh-token rotation, OIDC nonce, scope-downgrade, and redirect-URI matching.

[rfc6749]: https://datatracker.ietf.org/doc/html/rfc6749

## State parameter CSRF defense

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

## Client-credentials grant (M2M)

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

## Refresh-token rotation

Per RFC 9700: refresh tokens for public clients (browser/native)
should rotate on use - each refresh issues a new refresh token,
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

If reuse-detection isn't enabled, mark **critical** - old tokens
remaining valid after rotation defeats the purpose.

## OIDC nonce + ID-token validation

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

## Scope-grant verification

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

## Redirect-URI strict matching

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
