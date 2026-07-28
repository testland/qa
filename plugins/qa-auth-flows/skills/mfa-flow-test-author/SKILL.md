---
name: mfa-flow-test-author
description: "Build-an-X workflow for authoring automated tests covering multi-factor authentication flows: TOTP (RFC 6238, deterministic codes from a known secret + fixed time), HOTP (RFC 4226, counter-based), SMS/email OTP, WebAuthn/passkey registration and authentication via Chrome DevTools Protocol virtual authenticator (WebAuthn L2 §11), recovery codes, MFA enrollment, and step-up authentication challenges. Use when the team needs end-to-end MFA test coverage beyond what oauth-flow-test-author covers, or when introducing a new second factor to an existing auth surface."
metadata:
  keywords: "mfa, totp, hotp, webauthn, passkey, otp, sms, recovery-codes, step-up, enrollment, rfc6238, rfc4226"
---

# mfa-flow-test-author

## Overview

This skill is the per-flow test recipe for multi-factor authentication.
It covers the six second-factor mechanisms most commonly found in production
systems. Neighbour skills handle the first-factor and session layers:
`oauth-flow-test-author` covers
the primary OAuth/OIDC token flow;
`session-management-test-author`
covers the post-authentication session lifecycle.

## Shared setup

All test patterns below require a known, fixed second-factor secret in the
test environment. Never use production secrets in tests. Provision per-run
secrets using the relevant library and store them in the test fixture.

```python
# Common imports used across patterns in this skill
import base64, hashlib, hmac, struct, time
import pyotp          # pyauth.github.io/pyotp
```

## Step 1 - TOTP (RFC 6238)

Per [RFC 6238 §4.2][rfc6238], TOTP = HOTP(K, T) where T = floor((t - T0) / X),
T0 = Unix epoch 0 and X = time step (default 30s). TOTP is testable because it
is deterministic: a fixed secret + fixed `for_time` always yields the same code.
Generate the expected code with `pyotp.TOTP.at(for_time)` ([pyotp][pyotp]) and
compare it against what the server accepts.

Interoperability test vectors are in [RFC 6238 Appendix B][rfc6238-b]: ASCII
secret `12345678901234567890` at Unix time 59 produces `94287082` with SHA-1.

```python
import pyotp

def make_totp_fixture(digits=6, interval=30):
    """Return a base32 secret and the matching pyotp.TOTP instance."""
    secret = pyotp.random_base32()     # 32-char base32 per pyotp docs
    totp = pyotp.TOTP(secret, digits=digits, interval=interval)
    return secret, totp

def test_totp_happy_path(client, db):
    secret, totp = make_totp_fixture()
    # Seed the user's MFA secret in the test fixture (not production DB)
    db.set_totp_secret(user_id="alice", secret=secret)

    fixed_time = 1_234_567_890        # deterministic: RFC 6238 Appendix B
    expected_code = totp.at(for_time=fixed_time)   # "89005924" for SHA-1

    response = client.post(
        "/auth/mfa/verify",
        json={"otp": expected_code},
        headers={"X-Test-Time": str(fixed_time)},  # server must accept clock injection
    )
    assert response.status_code == 200

def test_totp_wrong_code_rejected(client, db):
    secret, totp = make_totp_fixture()
    db.set_totp_secret(user_id="alice", secret=secret)

    wrong_code = "000000"
    response = client.post("/auth/mfa/verify", json={"otp": wrong_code})
    assert response.status_code in [400, 401]
    assert "invalid" in response.json().get("error", "").lower()

def test_totp_expired_step_rejected(client, db):
    """A code more than valid_window steps old must be rejected."""
    secret, totp = make_totp_fixture()
    db.set_totp_secret(user_id="alice", secret=secret)

    old_time = time.time() - 120      # 4 steps ago; outside the grace window
    stale_code = totp.at(for_time=old_time)
    response = client.post("/auth/mfa/verify", json={"otp": stale_code})
    assert response.status_code in [400, 401]
```

**Clock injection requirement:** the server MUST accept a test-controlled
clock value (env var, header, or config) so the test can pass a fixed
`for_time`. If the server cannot accept clock injection, freeze the system
clock for the test process instead. Tests that rely on `time.time()` with
`valid_window > 0` are timing-dependent and flaky.

## Step 2 - HOTP (RFC 4226)

HOTP(K, C) is counter-based: K is the shared secret, C the counter. The client
increments C on each use; the server increments only on successful validation
and keeps a look-ahead window `s` ([RFC 4226 §7.4][rfc4226]) to tolerate drift.

Test vectors (Appendix D of [RFC 4226][rfc4226]): secret
`12345678901234567890`, counter 0 -> `755224`, counter 1 -> `287082`.

```python
def test_hotp_sequential_codes(client, db):
    secret = pyotp.random_base32()
    hotp = pyotp.HOTP(secret)           # pyotp.HOTP(s, digits=6, initial_count=0)
    db.set_hotp_secret(user_id="bob", secret=secret, counter=0)

    # Each code is valid exactly once; server increments counter on success
    for counter in range(3):
        code = hotp.at(counter)
        response = client.post("/auth/mfa/verify", json={"otp": code})
        assert response.status_code == 200, f"counter {counter} rejected"

def test_hotp_replay_rejected(client, db):
    """Replaying a used counter code must be rejected (counter advanced)."""
    secret = pyotp.random_base32()
    hotp = pyotp.HOTP(secret)
    db.set_hotp_secret(user_id="bob", secret=secret, counter=0)

    code = hotp.at(0)
    client.post("/auth/mfa/verify", json={"otp": code})   # consume counter 0
    replay = client.post("/auth/mfa/verify", json={"otp": code})
    assert replay.status_code in [400, 401]

def test_hotp_look_ahead_resync(client, db):
    """Server must accept a code within the resync window (RFC 4226 §7.4)."""
    secret = pyotp.random_base32()
    hotp = pyotp.HOTP(secret)
    db.set_hotp_secret(user_id="bob", secret=secret, counter=0)
    # Client is 2 steps ahead (simulates missed increments)
    ahead_code = hotp.at(2)
    response = client.post("/auth/mfa/verify", json={"otp": ahead_code})
    assert response.status_code == 200
```

## Step 3 - SMS / email OTP

SMS and email OTPs are not standardized in a single RFC. Test them by
controlling the delivery channel: inject a fixed code via a stub
(test-double transport), then verify that:

1. The code is accepted within its TTL.
2. The code is rejected after expiry.
3. The code cannot be used a second time (single-use).
4. A wrong code is rejected.

```python
def test_sms_otp_happy_path(client, sms_stub):
    """sms_stub is a test double that captures outbound OTPs."""
    client.post("/auth/mfa/send-otp", json={"channel": "sms"})
    captured_otp = sms_stub.last_otp()          # read from the stub

    response = client.post("/auth/mfa/verify", json={"otp": captured_otp})
    assert response.status_code == 200

def test_sms_otp_single_use(client, sms_stub):
    client.post("/auth/mfa/send-otp", json={"channel": "sms"})
    captured_otp = sms_stub.last_otp()
    client.post("/auth/mfa/verify", json={"otp": captured_otp})   # consume
    replay = client.post("/auth/mfa/verify", json={"otp": captured_otp})
    assert replay.status_code in [400, 401]

def test_sms_otp_expired(client, sms_stub, freeze_clock):
    client.post("/auth/mfa/send-otp", json={"channel": "sms"})
    captured_otp = sms_stub.last_otp()
    freeze_clock.advance(seconds=600)           # advance past TTL
    response = client.post("/auth/mfa/verify", json={"otp": captured_otp})
    assert response.status_code in [400, 401]
```

Email OTP tests follow the same pattern; replace `sms_stub` with an
email delivery stub (e.g., a mock SMTP sink such as Mailpit or MailHog).

## Step 4 - WebAuthn / passkey (virtual authenticator)

Registration calls `navigator.credentials.create()`; authentication calls
`navigator.credentials.get()` and produces a signed assertion. For CI, bypass
the physical device with the Chrome DevTools Protocol [WebAuthn domain][cdp-webauthn]
virtual authenticator (WebAuthn L2 §11), reached in Playwright via
`browserContext.newCDPSession(page)` ([pw-cdp][pw-cdp]).

```python
# Playwright + CDP virtual authenticator pattern (Python)
import pytest
from playwright.sync_api import sync_playwright

@pytest.fixture
def virtual_auth_page():
    with sync_playwright() as p:
        browser = p.chromium.launch()          # CDP only on Chromium
        context = browser.new_context()
        page = context.new_page()

        cdp = context.new_cdp_session(page)
        cdp.send("WebAuthn.enable", {"enableUI": False})

        result = cdp.send("WebAuthn.addVirtualAuthenticator", {
            "options": {
                "protocol": "ctap2",
                "transport": "internal",
                "hasResidentKey": True,
                "hasUserVerification": True,
                "isUserVerified": True,
                "automaticPresenceSimulation": True,   # auto-approve gestures
            }
        })
        authenticator_id = result["authenticatorId"]

        yield page, cdp, authenticator_id

        cdp.send("WebAuthn.removeVirtualAuthenticator",
                 {"authenticatorId": authenticator_id})
        browser.close()


def test_webauthn_registration(virtual_auth_page, app_url):
    """Happy path: register a passkey with the virtual authenticator."""
    page, cdp, auth_id = virtual_auth_page
    page.goto(f"{app_url}/settings/passkeys")
    page.click("#register-passkey")
    page.wait_for_selector("#passkey-registered-confirmation")
    assert page.is_visible("#passkey-registered-confirmation")

    creds = cdp.send("WebAuthn.getCredentials", {"authenticatorId": auth_id})
    assert len(creds["credentials"]) == 1
```

Full authentication round-trip, user-verification enforcement, and server-side
verification with `@simplewebauthn/server` (persist `newCounter` to block
signature-counter replay):
[references/webauthn-virtual-authenticator.md](references/webauthn-virtual-authenticator.md).

## Step 5 - Recovery codes

Single-use backup tokens. Test:

1. A valid unused code grants access.
2. The code cannot be used a second time.
3. An invalid code is rejected.
4. Exhausting all codes forces re-enrollment (or locks the account per policy).

```python
def test_recovery_code_single_use(client, db):
    codes = db.generate_recovery_codes(user_id="alice", count=8)
    first_code = codes[0]

    r1 = client.post("/auth/mfa/verify", json={"recovery_code": first_code})
    assert r1.status_code == 200

    r2 = client.post("/auth/mfa/verify", json={"recovery_code": first_code})
    assert r2.status_code in [400, 401]     # consumed

def test_invalid_recovery_code_rejected(client, db):
    db.generate_recovery_codes(user_id="alice", count=8)
    r = client.post("/auth/mfa/verify", json={"recovery_code": "XXXX-XXXX"})
    assert r.status_code in [400, 401]
```

## Step 6 - MFA enrollment

Enrollment binds a second factor to an account. Test:

1. Enrollment requires a valid first-factor session.
2. Enrollment completes only after the user verifies the factor (confirm OTP
   or passkey ceremony completes).
3. Enrollment cannot be completed with a wrong verification code.
4. Concurrent enrollment requests do not create duplicate factors.

```python
def test_totp_enrollment_requires_valid_session(client):
    # Unauthenticated request to the enroll endpoint must be rejected
    r = client.post("/auth/mfa/enroll/totp")
    assert r.status_code in [401, 403]

def test_totp_enrollment_verify_confirms_factor(client, db, authenticated_session):
    r = client.post("/auth/mfa/enroll/totp",
                    headers=authenticated_session.headers)
    assert r.status_code == 200
    provisioned_secret = r.json()["secret"]   # server-generated, base32

    totp = pyotp.TOTP(provisioned_secret)
    confirm_code = totp.now()

    r2 = client.post("/auth/mfa/enroll/totp/confirm",
                     json={"otp": confirm_code},
                     headers=authenticated_session.headers)
    assert r2.status_code == 200
    assert db.user_has_totp(user_id=authenticated_session.user_id)
```

## Step 7 - Step-up authentication

Re-challenge a valid session for its second factor before a sensitive operation.

```python
def test_step_up_triggers_mfa_challenge(client, authenticated_session_no_mfa):
    """Accessing a privileged endpoint without MFA should return 403/step-up."""
    r = client.delete("/account/delete",
                      headers=authenticated_session_no_mfa.headers)
    assert r.status_code in [403, 401]
    data = r.json()
    assert data.get("mfa_required") is True

def test_step_up_grants_access_after_mfa(client, db, authenticated_session_no_mfa):
    """After completing MFA the privileged operation is permitted."""
    secret, totp = make_totp_fixture()
    db.set_totp_secret(user_id=authenticated_session_no_mfa.user_id,
                       secret=secret)

    fixed_time = 1_234_567_890
    code = totp.at(for_time=fixed_time)

    # Step-up: verify MFA
    step_up = client.post(
        "/auth/step-up",
        json={"otp": code},
        headers={**authenticated_session_no_mfa.headers,
                 "X-Test-Time": str(fixed_time)},
    )
    assert step_up.status_code == 200
    elevated_token = step_up.json()["elevated_token"]

    # Use elevated token on the privileged endpoint
    r = client.delete("/account/delete",
                      headers={"Authorization": f"Bearer {elevated_token}"})
    assert r.status_code == 200
```

## Step 8 - End-to-end MFA coverage checklist

For each second factor in scope:

1. Happy path (valid code/credential accepted)
2. Wrong code/credential rejected
3. Expired code rejected (TOTP, SMS/email OTP)
4. Replay rejected (HOTP, recovery codes, SMS/email OTP)
5. Enrollment requires authenticated session
6. Enrollment requires successful verification of the new factor
7. Step-up re-challenges on privileged operations
8. Recovery codes: single-use + invalid-code rejection
9. WebAuthn: registration round-trip, authentication round-trip,
   UV enforcement, credential storage verified via CDP

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Call `totp.now()` without clock injection | Test is time-dependent; window drift makes it flaky | Use `totp.at(for_time=fixed_time)` with clock injection |
| Use real SMS/email in tests | Network dependency; non-deterministic; costs money | Replace transport with a test-double stub |
| Use PKCE `plain` in the surrounding OAuth flow | Defeats PKCE per RFC 7636 §4.2 | Always S256; see `oauth-flow-test-author` |
| Skip replay test for OTPs | Single-use property unverified | Step 2 / Step 3 negative cases |
| Launch a real authenticator device for WebAuthn | Blocks CI; hardware not available headlessly | CDP virtual authenticator (Step 4) |
| Test only the happy enrollment path | Enrollment with wrong code silently succeeds | Step 6 confirm-with-wrong-code negative test |
| Trust `signCount == 0` as a sign of no replay risk | Some authenticators always report 0; server must track and reject decreasing counts | Persist `newCounter` from `verifyAuthenticationResponse` |

## Limitations

- CDP virtual authenticator is **Chromium-only**; it is not available on
  Firefox or WebKit. Add a skip guard (`pytest.mark.skipif`) for non-Chromium
  browser fixtures.
- `automaticPresenceSimulation: True` suppresses the user-gesture requirement;
  tests do not cover the UI/UX of the authenticator prompt itself. Cover
  prompt rendering with a separate visual-regression test.
- This skill is the per-flow recipe. IdP-specific enrollment UIs (Keycloak OTP
  policies, Auth0 Actions, Okta Factors API) are in
  `keycloak-tests`,
  `auth0-tests`,
  `okta-tests`.
- `pyotp` requires a base32-encoded secret per [pyauth.github.io/pyotp][pyotp];
  the raw ASCII secrets used in RFC 6238 Appendix B test vectors must be
  base32-encoded before passing to `pyotp.TOTP`.

## References

- [rfc6238] RFC 6238 TOTP: Time-Based One-Time Password Algorithm
  https://datatracker.ietf.org/doc/html/rfc6238
- [rfc6238-b] RFC 6238 Appendix B test vectors
  https://datatracker.ietf.org/doc/html/rfc6238#appendix-B
- [rfc4226] RFC 4226 HOTP: An HMAC-Based One-Time Password Algorithm
  https://datatracker.ietf.org/doc/html/rfc4226
- [webauthn-l2] W3C Web Authentication Level 2
  https://www.w3.org/TR/webauthn-2/
- [cdp-webauthn] Chrome DevTools Protocol - WebAuthn domain
  https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
- [pw-cdp] Playwright CDPSession.send()
  https://playwright.dev/docs/api/class-cdpsession
- [simplewebauthn-server] SimpleWebAuthn - Server package
  https://simplewebauthn.dev/docs/packages/server
- [pyotp] PyOTP - Python One-Time Password library
  https://pyauth.github.io/pyotp/
- `oauth-flow-test-author` - companion: first-factor OAuth/OIDC flows
- `session-management-test-author` - companion: post-auth session lifecycle
- `keycloak-tests`, `auth0-tests`, `okta-tests` - IdP-specific enrollment patterns

[rfc6238]: https://datatracker.ietf.org/doc/html/rfc6238
[rfc6238-b]: https://datatracker.ietf.org/doc/html/rfc6238#appendix-B
[rfc4226]: https://datatracker.ietf.org/doc/html/rfc4226
[webauthn-l2]: https://www.w3.org/TR/webauthn-2/
[cdp-webauthn]: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
[pw-cdp]: https://playwright.dev/docs/api/class-cdpsession
[simplewebauthn-server]: https://simplewebauthn.dev/docs/packages/server
[pyotp]: https://pyauth.github.io/pyotp/
