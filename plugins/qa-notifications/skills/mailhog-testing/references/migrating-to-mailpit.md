# Migrating from MailHog to Mailpit

Deep reference for the `mailhog-testing` SKILL.md. Consult when moving an
existing MailHog deployment to Mailpit (per `mailpit-testing`), the actively
maintained successor with a flatter API.

## Why migrate

MailHog has had no significant release since ~2020 and is effectively
unmaintained. Mailpit is the actively maintained successor with a flatter
JSON schema, a single REST API for both reads and deletes, and richer
per-recipient chaos configuration.

## Feature mapping

| MailHog | Mailpit equivalent |
|---|---|
| SMTP on `1025` | SMTP on `1025` (same) |
| HTTP UI on `8025` | Web UI on `8025` (same) |
| `GET /api/v2/messages` | `GET /api/v1/messages` (path differs; flat schema) |
| `GET /api/v2/search?kind=to&query=...` | `GET /api/v1/search?query=to:...` (Lucene-ish syntax) |
| `DELETE /api/v1/messages` | `DELETE /api/v1/messages` (same path) |
| `mailhog -invite-jim` | Chaos mode (richer per-recipient config) |

## Schema rewrite

The largest test-code change is the message schema. MailHog nests the
subject as `Content.Headers.Subject[0]` (an array) and the body as
`Content.Body`; Mailpit exposes a flat `Subject` string and moves the body
to `Text`. Every assertion that walks MailHog's nested structure must be
rewritten against Mailpit's flatter shape.

## Cutover steps

1. Stand up Mailpit alongside MailHog on different ports temporarily.
2. Update test code to hit Mailpit's endpoints and flatter schema.
3. Run both in CI in parallel for one PR cycle to confirm parity.
4. Cut over, then retire the MailHog service.

## Chaos parity

MailHog's Jim chaos monkey (`mailhog -invite-jim`) injects random connection
drops and slow responses at globally configured probabilities. Mailpit's
Chaos mode replaces it with per-recipient configuration, so migrate
resilience tests to Mailpit Chaos rather than porting Jim's flags.
