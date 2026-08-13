# qa-notifications

Notifications + messaging testing across email, SMS, push, and
webhooks. Mailpit is the email-testing home (SMTP capture, the full
email-flow workflow, and legacy MailHog migration in its references);
sms-test-author covers Twilio Magic Numbers + segment counting + STOP
keywords; push-notification-test-author covers Web Push / APNs / FCM
plus the in-app notification workflow in its references; and
webhook-delivery-tester is the single marketplace-wide webhook-testing
home (sender + receiver, with inbound capture-and-replay hardening in
its references).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [mailpit-testing](skills/mailpit-testing/SKILL.md) | Email-testing home: Mailpit SMTP capture + REST assertions + Chaos mode; email-flow workflow and MailHog legacy/migration in references/ |
| Skill | [sms-test-author](skills/sms-test-author/SKILL.md) | Build-an-X for SMS via Twilio Test Credentials + Magic Numbers; segment counting (GSM-7 vs UCS-2); rate limit; STOP/HELP keyword handling; sender-type per geography |
| Skill | [push-notification-test-author](skills/push-notification-test-author/SKILL.md) | Build-an-X across Web Push (RFC 8030+VAPID) + APNs + FCM; subscription handshake; payload + click-action; 410-cleanup; silent vs alert; in-app workflow in references/ |
| Skill | [webhook-delivery-tester](skills/webhook-delivery-tester/SKILL.md) | The webhook-testing home (sender + receiver) per Standard Webhooks: HMAC-SHA256 signing, retry+backoff, replay window, idempotent processing; inbound replay hardening in references/ |
| Agent | [notification-delivery-critic](agents/notification-delivery-critic.md) | Adversarial critic scanning notification-send code (email/SMS/push/webhook) for delivery-reliability defects: missing idempotency, absent bounce/unsubscribe handlers, missing DKIM/SPF/DMARC alignment, missing retry/backoff, absent dead-letter handling; emits BLOCK or PASS |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-notifications@testland-qa
```
