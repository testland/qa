# qa-notifications

Notifications + messaging testing across email, SMS, push, and
webhooks. Two SMTP-capture wrappers (Mailpit current; MailHog
legacy) plus four build-an-X workflow skills covering full
notification flows: email (multipart + tracking + bounce), SMS
(Twilio Magic Numbers + segment counting + STOP keywords), push
(Web Push / APNs / FCM with expired-subscription cleanup), and
webhook delivery (Standard Webhooks signing + replay defense).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [mailpit-testing](skills/mailpit-testing/SKILL.md) | Modern dev mailbox; SMTP 1025 + Web UI 8025; REST API for assertions; Chaos mode; tagging via plus-addressing |
| Skill | [mailhog-testing](skills/mailhog-testing/SKILL.md) | Legacy dev mailbox (predecessor to Mailpit); APIv2; Jim chaos monkey; migration-to-Mailpit guide |
| Skill | [email-flow-test-author](skills/email-flow-test-author/SKILL.md) | Build-an-X for end-to-end email: capture → headers (incl. List-Unsubscribe) → multipart body → link-rewrite resolution → unsubscribe one-click → bounce/complaint webhooks |
| Skill | [sms-test-author](skills/sms-test-author/SKILL.md) | Build-an-X for SMS via Twilio Test Credentials + Magic Numbers; segment counting (GSM-7 vs UCS-2); rate limit; STOP/HELP keyword handling; sender-type per geography |
| Skill | [push-notification-test-author](skills/push-notification-test-author/SKILL.md) | Build-an-X across Web Push (RFC 8030+VAPID) + APNs + FCM; subscription handshake; payload + click-action; 410-cleanup; silent vs alert |
| Skill | [webhook-delivery-tester](skills/webhook-delivery-tester/SKILL.md) | Build-an-X per Standard Webhooks: HMAC-SHA256 signing, retry+backoff, replay window, idempotent processing, vendor sample payloads (Stripe/Twilio/SendGrid/GitHub/GitLab) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-notifications@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
