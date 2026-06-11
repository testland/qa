---
name: email-flow-test-author
description: "Build-an-X for end-to-end email-flow tests - trigger → SMTP capture (via Mailpit / MailHog) → header assertions (DKIM/SPF/DMARC when relayed via real MTA) → body assertions (HTML + plain-text alternative) → link-rewrite + tracking-pixel handling → unsubscribe-link verification → bounce + complaint testing in non-prod (via Mailtrap-style services). Use when authoring tests for any transactional or marketing email flow regardless of the SMTP capture tool."
rating: 24
d6: 4
---

# email-flow-test-author

## Overview

Email is the most underspecified surface in modern web apps. A
"the email got sent" assertion misses:

- Did the user receive both HTML + plain-text alternatives? (RFC
  2046 §5.1.4 multipart/alternative)
- Was the link in the email actually correct (after tracking
  rewrites)?
- Did the unsubscribe link work?
- For relayed messages: do DKIM / SPF / DMARC pass?
- Does the app handle bounces + complaints?

This skill is a **build-an-X workflow** - a checklist and per-stage
test recipes, not a single tool. Pair with [`mailpit-testing`](../mailpit-testing/SKILL.md)
or [`mailhog-testing`](../mailhog-testing/SKILL.md) for SMTP
capture.

## When to use

- Any feature triggers a transactional email (signup, password
  reset, order confirmation, account notification).
- Marketing-email integration with the app needs regression
  coverage.
- Compliance review requires evidence of unsubscribe + bounce
  handling.

## Step 1 - Stage your capture environment

Per [`mailpit-testing`](../mailpit-testing/SKILL.md):

```yaml
# CI config
services:
  mailpit:
    image: axllent/mailpit:v1.20.0
    ports: [1025:1025, 8025:8025]
```

Configure the app to relay via this SMTP for the test environment.

## Step 2 - Trigger + capture

```python
from email_test_helpers import trigger_password_reset, capture_one_email

def test_password_reset_email_complete():
    msg = capture_one_email(
        action=lambda: trigger_password_reset("alice@example.com"),
        recipient="alice@example.com",
        timeout=5,
    )
    # Now assert against `msg`
```

(`capture_one_email` is the helper from
[`mailpit-testing`](../mailpit-testing/SKILL.md) Step 4.)

## Step 3 - Header assertions

```python
def test_email_headers(msg):
    assert msg["From"]["Address"] == "noreply@example.com"
    assert msg["To"][0]["Address"] == "alice@example.com"
    assert msg["Subject"] == "Reset your password"
    assert "List-Unsubscribe" in msg["Headers"]    # required by Gmail/Yahoo bulk-sender rules
    assert "List-Unsubscribe-Post" in msg["Headers"]   # one-click unsubscribe per RFC 8058
```

For relayed-via-MTA tests (where DKIM signing happens), additional
checks:

- DKIM signature present + valid
- SPF-aligned `Return-Path`
- DMARC-aligned `From`

These checks require a relay capable of signing (production MTA or a
test-relay like Postmark sandbox). Mailpit doesn't sign; verify
DKIM in a separate staging-with-real-MTA test layer.

## Step 4 - Body content assertions

Email is multipart: HTML and plain-text alternatives. Both need
verification:

```python
def test_email_body_alternatives(msg):
    # Plain-text body present
    assert msg["Text"]
    assert "alice" in msg["Text"]
    assert "/reset?token=" in msg["Text"]

    # HTML body present + matches plain-text intent
    html = msg["HTML"]
    assert "<a href=" in html
    assert "/reset?token=" in html

    # The "view in browser" link
    assert ("/view-in-browser/" in html) or ("This email best viewed" in html)
```

Per RFC 2046 §5.1.4, mailers should always include a plain-text
alternative; tests catch when developers ship HTML-only emails by
accident.

## Step 5 - Link rewriting + tracking pixels

Many email service providers (Mailgun, SendGrid, Postmark,
Customer.io) rewrite links for click tracking. After rewriting, the
link in the captured email points to the ESP's tracker, not the
target URL.

Test pattern: assert against the **final** URL after redirect, not
the rewritten one:

```python
import requests

def resolve_redirects(url, max_hops=5):
    for _ in range(max_hops):
        response = requests.get(url, allow_redirects=False, timeout=5)
        if response.status_code not in (301, 302, 303, 307, 308):
            return response.url
        url = response.headers["Location"]
    raise ValueError("Too many redirects")

def test_password_reset_link_resolves_to_app(msg):
    link = extract_first_link(msg["HTML"])
    final_url = resolve_redirects(link)
    assert "example.com/reset" in final_url
    assert "token=" in final_url
```

For tests of unsigned ESP links, accept the rewrite as expected and
test that resolution lands on the app's domain.

## Step 6 - Unsubscribe-link verification

```python
def test_unsubscribe_link_works(msg):
    unsubscribe_url = msg["Headers"]["List-Unsubscribe"][0].strip("<>")
    response = requests.post(unsubscribe_url)
    assert response.status_code == 200

    # Verify the user is now unsubscribed:
    user = User.objects.get(email="alice@example.com")
    assert user.subscribed is False
```

Per RFC 8058, one-click unsubscribe is a POST (not GET) to the
`List-Unsubscribe` URL with body `List-Unsubscribe=One-Click`.

## Step 7 - Bounce + complaint handling

Bounces (delivery failures) and complaints (recipient marks as
spam) come from the ESP via webhook. Test the app's handler with a
representative payload:

```python
def test_bounce_webhook_marks_user_undeliverable(client):
    bounce_payload = {
        "event": "bounce",
        "recipient": "bounce@nonexistent.example.com",
        "reason": "550 5.1.1 user unknown",
    }
    response = client.post("/webhooks/email-events", json=bounce_payload)
    assert response.status_code == 200

    user = User.objects.get(email="bounce@nonexistent.example.com")
    assert user.email_status == "undeliverable"
```

For each ESP, find a sample bounce/complaint payload in the ESP's
docs and use it as the test fixture.

## Step 8 - DKIM/SPF/DMARC for production-bound emails

These are MTA-side concerns; tests in CI typically don't validate
them. For a pre-production layer:

- **mail-tester.com**: send a test email; receive a 0 - 10 deliverability score covering DKIM/SPF/DMARC + content quality
- **dmarcian.com**: per-domain DMARC monitoring for production
- Postmark / SendGrid / Mailgun **inbound parse** sandbox to test what arrives

## Step 9 - End-to-end test recipe

For each email flow in scope:

1. ✅ Trigger + capture via Mailpit (Step 2)
2. ✅ Header assertions including `List-Unsubscribe` (Step 3)
3. ✅ Multipart body - both text + HTML present (Step 4)
4. ✅ Link rewrites resolve to app domain (Step 5)
5. ✅ Unsubscribe one-click POST works (Step 6)
6. ✅ Bounce webhook handler updates user state (Step 7)
7. ✅ Complaint webhook handler updates user state (Step 7)
8. ✅ Pre-prod DKIM/SPF/DMARC verification via mail-tester
   (out-of-CI; periodic) (Step 8)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only "the send happened" | Misses every content + link issue | Steps 3 - 6 |
| Skip plain-text alternative | Many corporate gateways strip HTML; bare HTML emails appear blank | Always assert both (Step 4) |
| Hardcode rewritten ESP link | Tests fail when ESP rotates tracker domains | Resolve to final URL (Step 5) |
| Skip unsubscribe test | Compliance failure (CAN-SPAM, CASL, GDPR) + ISP penalties | One-click test (Step 6) |
| Skip bounce/complaint webhooks | Sender reputation degrades; deliverability drops | Per-ESP fixture tests (Step 7) |

## Limitations

- This is a build-an-X workflow. Tests use the application's HTTP
  client + an SMTP capture tool ([`mailpit-testing`](../mailpit-testing/SKILL.md)
  or [`mailhog-testing`](../mailhog-testing/SKILL.md)).
- DKIM / SPF / DMARC validation requires a real MTA; CI tests
  cover content + handler logic, not authentication-on-the-wire.
- Per-ESP webhook payloads vary; test fixtures must come from each
  ESP's official docs.
- Email rendering across clients (Outlook, Gmail, Apple Mail)
  isn't covered here - that's a [`pdf-print-render`](../../../qa-pdf-print/README.md)-adjacent
  domain (visual regression for email).

## References

- IETF RFC 2046 §5.1.4 - multipart/alternative
- IETF RFC 8058 - Signaling One-Click Functionality for List-Unsubscribe Email Headers
- IETF RFC 5321 - Simple Mail Transfer Protocol (SMTP)
- IETF RFC 5322 - Internet Message Format
- mail-tester.com - pre-prod deliverability scoring
- dmarcian.com - DMARC monitoring
- [`mailpit-testing`](../mailpit-testing/SKILL.md),
  [`mailhog-testing`](../mailhog-testing/SKILL.md) - SMTP capture
  partners
- [`webhook-delivery-tester`](../webhook-delivery-tester/SKILL.md) - 
  companion: bounce/complaint webhook handlers receive vendor
  webhooks; same patterns
- [`sms-test-author`](../sms-test-author/SKILL.md),
  [`push-notification-test-author`](../push-notification-test-author/SKILL.md) - sister channels in this plugin
