# WebAuthn virtual-authenticator deep patterns

Extends Step 4 of SKILL.md. Reuses the `virtual_auth_page` fixture defined
there (Playwright + CDP `WebAuthn.addVirtualAuthenticator`).

## Ceremonies

[WebAuthn Level 2 §7.1][webauthn-l2] registration: `navigator.credentials.create()`
with `PublicKeyCredentialCreationOptions` makes the authenticator mint an
asymmetric key pair; the server verifies the attestation. Authentication (§7.2)
uses `navigator.credentials.get()` to produce a signed assertion. The CDP
[WebAuthn domain][cdp-webauthn] provides the virtual authenticator per
WebAuthn L2 §11 ("User Agent Automation").

## Authentication round-trip

```python
def test_webauthn_authentication(virtual_auth_page, app_url):
    """Full round-trip: register then authenticate with the same passkey."""
    page, cdp, auth_id = virtual_auth_page
    # Register first
    page.goto(f"{app_url}/settings/passkeys")
    page.click("#register-passkey")
    page.wait_for_selector("#passkey-registered-confirmation")

    # Now authenticate
    page.goto(f"{app_url}/login")
    page.click("#passkey-login")
    page.wait_for_url(f"{app_url}/dashboard")
    assert "/dashboard" in page.url
```

## User-verification enforcement

```python
def test_webauthn_user_verification_required(virtual_auth_page, app_url, cdp):
    """When UV is disabled mid-session, server must reject the assertion."""
    page, cdp, auth_id = virtual_auth_page
    cdp.send("WebAuthn.setUserVerified",
             {"authenticatorId": auth_id, "isUserVerified": False})
    page.goto(f"{app_url}/login")
    page.click("#passkey-login")
    page.wait_for_selector("#login-error")
    assert page.is_visible("#login-error")
```

## Server-side verification

Server-side verification uses `@simplewebauthn/server`
([simplewebauthn.dev/docs/packages/server][simplewebauthn-server]).
`verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin, expectedRPID })`
returns `{ verified, registrationInfo }`. After authentication,
`verifyAuthenticationResponse({ response, expectedChallenge, expectedOrigin, expectedRPID, credential })`
returns `{ verified, authenticationInfo: { newCounter } }` - persist `newCounter`
to prevent signature-counter replay.

[webauthn-l2]: https://www.w3.org/TR/webauthn-2/
[cdp-webauthn]: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
[simplewebauthn-server]: https://simplewebauthn.dev/docs/packages/server
