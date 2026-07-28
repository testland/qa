# Webhook retry schedules and per-vendor payloads

Reference data for `webhook-delivery-tester`. The core signing, verification,
and replay test code stays in `SKILL.md`; this file holds the lookup table and
per-vendor specifics that do not need to sit in the workflow spine.

## Canonical retry schedule

Per [Standard Webhooks](https://www.standardwebhooks.com/), senders retry with
exponential backoff plus jitter, capped at N attempts, then dead-letter. A
typical delay schedule:

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | 5s |
| 3 | 5min |
| 4 | 30min |
| 5 | 2h |
| 6 | 5h |
| 7 | 10h |
| 8 | (give up; dead-letter) |

Sender retry tests assert the attempt count and the backoff deltas between
attempts (Step 3 in `SKILL.md`). Dead-letter tests assert that after the max
attempts the webhook is recorded in a dead-letter store and not retried.

## Per-vendor sample payloads

For receiver tests of specific vendors, use the vendor's official sample
payloads (or captures from their webhook tester), never hand-rolled fixtures -
field names drift from real sends.

- Stripe: stripe.com/docs/webhooks -> "Sample events"
- Twilio: twilio.com/docs/usage/webhooks -> per-resource event docs
- SendGrid: docs.sendgrid.com/for-developers/tracking-events
- GitHub: docs.github.com/en/webhooks -> per-event payload reference
- GitLab: docs.gitlab.com/ee/user/project/integrations/webhook_events.html
