# Keycloak flow recipes

Deep reference for `keycloak-tests` Step 6. All snippets use the
`realm` fixture from SKILL.md Step 3 (the realm's discovery document).
`alice_token` / `bob_token` are defined in the PKCE section; the realm
fixture defines users alice / bob with those test passwords, the public
`mobile-app` client with the redirect below, and the confidential
`test-client`.

## Authorization code + PKCE (public client, private-scheme redirect)

The PKCE challenge is the unpadded base64url SHA-256 of a random
verifier, sent with `code_challenge_method=S256` ([RFC 7636][rfc7636]).

```python
import base64, hashlib, re, secrets
from html import unescape
from urllib.parse import urlparse, parse_qs
import pytest
import requests

REDIRECT = "com.corp.app://oauth/callback"

def pkce_pair():
    verifier = secrets.token_urlsafe(64)[:96]
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge

def pkce_login(realm, client_id, redirect, username, password):
    """Drive the real login page; return the access token."""
    verifier, challenge = pkce_pair()
    with requests.Session() as s:                      # keeps the login cookies
        page = s.get(realm["authorization_endpoint"], params={
            "client_id": client_id, "response_type": "code",
            "redirect_uri": redirect, "scope": "openid",
            "code_challenge": challenge, "code_challenge_method": "S256",
        }, timeout=5)
        action = unescape(re.search(r'action="([^"]+)"', page.text).group(1))
        resp = s.post(action, data={"username": username, "password": password},
                      allow_redirects=False, timeout=5)   # never follow the app scheme
        assert resp.status_code == 302
        location = resp.headers["Location"]
        assert location.startswith(redirect)
        code = parse_qs(urlparse(location).query)["code"][0]
    token = requests.post(realm["token_endpoint"], data={
        "grant_type": "authorization_code", "client_id": client_id,
        "code": code, "redirect_uri": redirect, "code_verifier": verifier,
    }, timeout=5)                                        # public client: no secret
    assert token.status_code == 200
    return token.json()["access_token"]

def test_mobile_login_pkce(realm):
    access = pkce_login(realm, "mobile-app", REDIRECT, "alice", "alicepass")
    info = requests.post(realm["introspection_endpoint"],
                         auth=("test-client", "test-secret"),
                         data={"token": access}, timeout=5).json()
    assert info["active"] is True
    assert info["preferred_username"] == "alice"     # the token is alice's

@pytest.fixture
def alice_token(realm):
    return pkce_login(realm, "mobile-app", REDIRECT, "alice", "alicepass")

@pytest.fixture
def bob_token(realm):
    return pkce_login(realm, "mobile-app", REDIRECT, "bob", "bobpass")
```

The login form's `action` comes from Keycloak's login page HTML; if the
theme is customised, select the form by id instead of the first
`action=`.

## Standard token exchange

Switch on **Standard token exchange** for the confidential requester
client in the realm fixture. Only access tokens are accepted as
`subject_token`; `audience` (optional, repeatable) names the target
client ([token exchange guide][kc-tx]).

```python
def test_token_exchange_narrows_audience(realm, alice_token):
    r = requests.post(realm["token_endpoint"], auth=("requester-client", "test-secret"), data={
        "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
        "subject_token": alice_token,
        "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
        "audience": "target-client",
    }, timeout=5)
    assert r.status_code == 200
```

Add the negative case: the same request from a client without the
switch must be refused.

## UMA / Authorization Services decision

Ask the token endpoint for a decision on `RESOURCE_ID#SCOPE_ID`;
`audience` is mandatory with `permission`. With
`response_mode=decision` the body is `{"result": true}`, and a request
that maps to no permission returns 403 ([Authorization Services][kc-az]).

```python
def test_alice_can_read_report(realm, alice_token):
    r = requests.post(realm["token_endpoint"],
        headers={"Authorization": f"Bearer {alice_token}"},
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:uma-ticket",
            "audience": "reports-api",
            "permission": "Report#read",
            "response_mode": "decision",
        }, timeout=5)
    assert r.status_code == 200 and r.json()["result"] is True

def test_bob_cannot_delete_report(realm, bob_token):
    r = requests.post(realm["token_endpoint"],
        headers={"Authorization": f"Bearer {bob_token}"},
        data={"grant_type": "urn:ietf:params:oauth:grant-type:uma-ticket",
              "audience": "reports-api", "permission": "Report#delete",
              "response_mode": "decision"}, timeout=5)
    assert r.status_code == 403
```

[rfc7636]: https://www.rfc-editor.org/rfc/rfc7636
[kc-tx]: https://www.keycloak.org/securing-apps/token-exchange
[kc-az]: https://www.keycloak.org/docs/latest/authorization_services/index.html
