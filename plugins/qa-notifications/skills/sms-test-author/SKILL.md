---
name: sms-test-author
description: "Build-an-X for SMS-flow tests - uses Twilio Magic Numbers (`+15005550006` valid recipient, `+15005550001` invalid number, `+15005550002` cannot route, `+15005550003` international restriction, etc.) and Test Credentials for safe assertion-only Twilio interactions; covers segment-counting (GSM-7 vs UCS-2 encoding); rate-limit + opt-out keyword (STOP / HELP / UNSUBSCRIBE) handling; alphanumeric sender vs short-code vs 10DLC differences. Use when authoring tests for any Twilio-backed SMS flow."
rating: 23
d6: 4
---

# sms-test-author

## Overview

Twilio is the dominant SMS provider for B2B SaaS; this skill
targets Twilio test patterns. The principles transfer to other
providers (Vonage, MessageBird, Plivo) with provider-specific
sandbox patterns.

The core challenge: SMS sends cost money + actually deliver to real
phones. Test patterns avoid both via:

1. **Test Credentials** - separate `accountSid` + `authToken` for
   testing; calls succeed/fail per the test pattern but never
   actually deliver
2. **Magic Numbers** - special phone numbers in the
   `+15005550000` - `+15005550009` range with documented behavior

## When to use

- The repo sends SMS via Twilio (transactional: 2FA codes, order
  status, alerts).
- Tests need to verify SMS-send code paths without real cost or
  delivery.
- The team wants regression coverage on segment-counting (long
  messages → multiple SMS).
- Compliance review requires evidence of opt-out (STOP) handling.

## Step 1 - Twilio Test Credentials setup

Per twilio.com/docs/iam/test-credentials, every Twilio account has
two credential pairs:

| Credential | Purpose |
|---|---|
| Live `(AccountSID, AuthToken)` | Real sends; cost money; deliver to real phones |
| Test `(AccountSID, AuthToken)` | Test sends; never deliver; respond per Magic-Number pattern |

In CI, set the SDK to use Test Credentials:

```python
from twilio.rest import Client

client = Client(
    os.environ["TWILIO_TEST_ACCOUNT_SID"],
    os.environ["TWILIO_TEST_AUTH_TOKEN"],
)
```

## Step 2 - Magic Numbers reference

Per twilio.com/docs/iam/test-credentials#magic-phone-numbers, the
canonical test numbers (current, verify against live docs):

| Number | Behavior |
|---|---|
| `+15005550006` | Valid recipient; SMS send succeeds |
| `+15005550001` | Invalid number; returns 400 |
| `+15005550002` | Cannot route to number; returns 400 |
| `+15005550003` | International restriction (when sending from US-only number); returns 400 |
| `+15005550004` | Number is blacklisted; returns 400 |
| `+15005550009` | Sender number cannot send SMS; returns 400 |

For sender numbers, similar magic numbers exist (e.g.,
`+15005550000` is "not owned by your account").

## Step 3 - Test the happy path

```python
def test_send_2fa_code_to_valid_number():
    client = twilio_test_client()
    message = client.messages.create(
        from_="+15005550006",   # valid sender
        to="+15005550006",       # valid recipient
        body="Your code is: 123456",
    )
    assert message.sid is not None
    assert message.status in ["queued", "sent"]
```

Note: Test Credentials don't support `messaging_service_sid`
sends - use direct `from_` numbers only in test mode.

## Step 4 - Test invalid recipients

```python
def test_invalid_number_raises():
    client = twilio_test_client()
    with pytest.raises(twilio.base.exceptions.TwilioRestException) as exc:
        client.messages.create(
            from_="+15005550006",
            to="+15005550001",       # invalid
            body="test",
        )
    assert exc.value.status == 400
```

## Step 5 - Segment-counting tests

SMS messages over 160 characters split into multiple segments.
Encoding affects the per-segment limit:

| Encoding | Per-segment chars | Per-segment with concatenation header |
|---|---:|---:|
| GSM-7 | 160 | 153 |
| UCS-2 (Unicode) | 70 | 67 |

Including a single emoji or non-GSM character forces UCS-2,
quartering the per-segment capacity.

```python
def test_message_segments_correctly():
    # 160-char ASCII message → 1 segment
    msg = "x" * 160
    assert calculate_segments(msg) == 1

    # 161-char ASCII → 2 segments (first segment now 153)
    msg = "x" * 161
    assert calculate_segments(msg) == 2

    # ASCII + 1 emoji → UCS-2; 70-char limit
    msg = "x" * 70 + "🎉"
    assert calculate_segments(msg) == 2   # one emoji forces multi-segment
```

For `calculate_segments`, libraries exist per language (e.g.,
`split-sms` for Node, `smssegment` for Python). Validate against
Twilio's actual segment count via the API after a send (Twilio
returns `num_segments` on the message resource).

## Step 6 - Rate-limit testing

Twilio enforces per-account + per-sender rate limits. Tests
shouldn't hit them in normal use, but for resilience:

```python
def test_rate_limit_handling(client):
    # Configure app for low-rate scenario
    sender = mock_rate_limited_response()
    response = my_app.send_sms(to="+15005550006", body="test")
    # Verify retry-with-backoff or graceful queue:
    assert response.status == "queued_for_retry"
```

Mock the Twilio response (HTTP 429) at the SDK boundary to test
without hitting actual rate limits.

## Step 7 - Opt-out keyword handling

US carriers (and CTIA guidelines) require handling of these inbound
keywords:

| Keyword | Required action |
|---|---|
| STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT | Stop sending; reply confirmation |
| HELP, INFO | Reply with help text + opt-out instructions |
| START, YES, UNSTOP | Resume sending after a previous STOP |

Test pattern: simulate an inbound SMS webhook from Twilio:

```python
def test_stop_keyword_unsubscribes_user(client):
    # Simulate Twilio inbound webhook
    response = client.post(
        "/webhooks/twilio/sms",
        data={
            "From": "+15555551234",
            "To": "+15005550006",
            "Body": "STOP",
            "MessageSid": "SM1234567890",
        },
    )
    assert response.status_code == 200
    assert "<Response>" in response.text   # TwiML response
    assert "unsubscribed" in response.text.lower()

    # Verify user is unsubscribed:
    user = User.objects.get(phone="+15555551234")
    assert user.sms_subscribed is False
```

## Step 8 - Test alphanumeric vs 10DLC vs short-code sender

Different sender types have different requirements:

| Type | Use | Cost | Throughput |
|---|---|---|---|
| 10DLC (10-digit long code) | US transactional + marketing | low | 1 - 100 MPS depending on tier |
| Short code (5-6 digit) | high-volume marketing | high | 100+ MPS |
| Alphanumeric sender | International only (no US) | low | varies by country |
| Toll-free | US transactional | low | 3 MPS |

Test that the app uses the correct sender type per geography:

```python
def test_us_recipient_uses_10dlc_sender():
    sent_message = capture_sms_send(to="+15555551234")
    assert is_10dlc_number(sent_message.from_)

def test_international_uses_alphanumeric():
    sent_message = capture_sms_send(to="+447700900000")   # UK
    assert sent_message.from_ == "MyBrand"   # alphanumeric ID
```

## Step 9 - End-to-end test recipe

For each SMS flow:

1. ✅ Happy-path send to Magic Number (Step 3)
2. ✅ Invalid-number error path (Step 4)
3. ✅ Segment counting verified for typical message sizes (Step 5)
4. ✅ Rate-limit-handling resilience (Step 6)
5. ✅ STOP / HELP keyword handling (Step 7)
6. ✅ Correct sender type per geography (Step 8)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Send to real numbers in CI | Cost + delivery to actual phones | Twilio Test Credentials + Magic Numbers (Steps 1 - 2) |
| Skip emoji / Unicode tests | Segment count quadruples; budget surprise + truncation | UCS-2 segment tests (Step 5) |
| Skip STOP-keyword test | Compliance failure (CTIA, A2P 10DLC) + carrier delisting | Inbound webhook test (Step 7) |
| Hardcode `from_` | Sender-type mismatch per geography | Per-recipient sender selection (Step 8) |
| Use Magic Numbers in production code paths | Magic Numbers are reserved; production sends fail | Magic Numbers ONLY in test mode |

## Limitations

- This skill targets Twilio. Other SMS providers (Vonage,
  MessageBird, Plivo, AWS SNS SMS) have similar patterns with
  provider-specific sandbox numbers.
- Twilio Magic Numbers list evolves; always cross-check current
  set at twilio.com/docs/iam/test-credentials.
- Test mode doesn't validate messaging-service routing logic;
  full integration requires sandbox sender numbers (paid).
- Carrier-specific delivery behavior (T-Mobile filtering, AT&T
  spam scoring) requires production-only testing.
- 10DLC registration + brand verification is a Twilio Console
  workflow; tests don't cover this layer.

## References

- twilio.com/docs/iam/test-credentials - Test Credentials + Magic Numbers
- twilio.com/docs/messaging - Messaging API reference
- ctia.org/the-wireless-industry/industry-commitments/messaging-interoperability - CTIA SMS-keyword guidelines
- [`email-flow-test-author`](../email-flow-test-author/SKILL.md) - 
  sister channel: opt-out + bounce patterns rhyme
- [`webhook-delivery-tester`](../webhook-delivery-tester/SKILL.md) - 
  companion: STOP-keyword webhook is a webhook that needs verification
- [`push-notification-test-author`](../push-notification-test-author/SKILL.md) - sister channel
