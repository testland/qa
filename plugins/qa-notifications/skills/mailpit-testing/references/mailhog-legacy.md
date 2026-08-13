# MailHog (legacy) capture + migration to Mailpit

Per [github.com/mailhog/MailHog][mh-gh]:

[mh-gh]: https://github.com/mailhog/MailHog

> "MailHog is an email testing tool for developers" that allows you
> to "Configure your application to use MailHog for SMTP delivery"
> and "View messages in the web UI, or retrieve them with the JSON
> API."

MailHog is **legacy** as of the mid-2020s - Mailpit (the host SKILL.md)
succeeded it with richer API + active maintenance. This reference covers
MailHog for existing deployments + provides migration guidance to Mailpit.

## When to use

- Existing MailHog deployment that the team isn't ready to migrate.
- A specific MailHog feature behaves differently than Mailpit's
  equivalent (rare; investigate before assuming MailHog-specific
  behavior is required).
- Tests already wired against MailHog's APIv2 + the team needs to
  document what the tests do before migration.

For new projects, use the host SKILL.md (Mailpit).

## How to use

1. Install MailHog via Go or Docker and start it - SMTP on `1025`, web UI + JSON API on `8025`.
2. Point the app under test at `localhost:1025` with SMTP auth disabled.
3. In each test, clear the mailbox (`DELETE /api/v1/messages`), trigger the action that sends mail, then poll APIv2 (`/api/v2/messages` or `/api/v2/search`) until the message lands.
4. Assert on the captured message, walking MailHog's nested `Content.Headers.Subject` array - see the Worked example.
5. Add failure-injection coverage with the Jim chaos monkey (`mailhog -invite-jim`); when leaving MailHog, follow Migrating to Mailpit.

## Install

Per [mh-gh][mh-gh]:

```bash
# Go install
go install github.com/mailhog/MailHog@latest
```

Docker:

```bash
docker run -d \
  --name mailhog \
  -p 1025:1025 \
  -p 8025:8025 \
  mailhog/mailhog
```

## Default ports

Per [mh-gh][mh-gh]:

| Port | Service |
|---|---|
| 1025 | SMTP server |
| 8025 | HTTP server (UI + APIv1 + APIv2) |

## Configure your app's SMTP

Same pattern as Mailpit (since both expose unauthenticated SMTP on
1025 by default):

```yaml
smtp:
  host: localhost
  port: 1025
  auth: none
```

## Assert via APIv2

Per [mh-gh][mh-gh] MailHog has both APIv1 + APIv2; APIv2 is the
modern one. Endpoints:

| Endpoint | Use |
|---|---|
| `GET /api/v2/messages` | List captured messages (paginated) |
| `GET /api/v2/messages?limit=N&start=M` | Pagination |
| `GET /api/v2/search?kind=to&query=alice@x.com` | Search by recipient / subject / containing |
| `DELETE /api/v1/messages` | Clear all messages (uses APIv1; APIv2 has no delete) |

The MailHog message structure is more nested than Mailpit's:
`Content.Headers.Subject` is an **array**, not the flat `Subject`
field Mailpit exposes. Walk the nested path or the assertion
silently fails.

## Worked example

Capture and assert a single password-reset email end to end. Clear
the mailbox first so a stale message can't satisfy the assertion,
trigger the app action, poll APIv2 until the message lands, then
assert on its subject and body:

```python
import requests

BASE = "http://localhost:8025"

def test_password_reset_via_mailhog():
    requests.delete(f"{BASE}/api/v1/messages")            # clear (APIv1 - no APIv2 delete)
    trigger_password_reset("alice@example.com")           # app under test sends the email
    msg = poll_for_message(BASE, to="alice@example.com")  # GET /api/v2/search?kind=to&query=...

    assert msg["Content"]["Headers"]["Subject"][0] == "Reset your password"
    assert "/reset?token=" in msg["Content"]["Body"]
```

`poll_for_message` retries `GET /api/v2/search?kind=to&query=alice@example.com`
until a message appears, then returns it. Sub-second SMTP delivery
isn't guaranteed, so never assert immediately after triggering.

## Jim chaos monkey

Per [mh-gh][mh-gh]: "Chaos Monkey for failure testing" via the Jim
component. Jim is configurable via CLI flags or environment:

```bash
mailhog -invite-jim   # enables the chaos monkey
```

Once Jim is invited, MailHog injects failures (random connection
drops, slow responses) per the configured probabilities.
Configuration flags are documented in `mailhog -h`; the README
references "Introduction to Jim" for details.

For new test work needing chaos, prefer Mailpit's Chaos mode
(host SKILL.md Step 5) - it has richer per-recipient configuration.

## CI integration

```yaml
services:
  mailhog:
    image: mailhog/mailhog
    ports: [1025:1025, 8025:8025]

steps:
  - run: pytest tests/integration/email/ -v
```

## Migrating to Mailpit

For new projects, and for teams ready to leave MailHog, migrate to
Mailpit (the host SKILL.md) - the actively maintained successor with a
flatter API and richer chaos configuration. The feature-mapping table,
the schema-rewrite notes, and the step-by-step cutover live in
[migrating-to-mailpit.md](migrating-to-mailpit.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Start new project on MailHog | Legacy; loses richer Mailpit features | Use Mailpit (Migrating to Mailpit + cross-skill) |
| Use APIv1 for new test code | Deprecated by APIv2 (within MailHog) | APIv2 endpoints (Assert via APIv2) |
| Assume MailHog flat schema | MailHog's `Content.Headers.Subject` is an array | Walk the nested structure (Worked example) |
| Skip per-test message clear | Same problem as Mailpit Step 4; stale messages | DELETE /api/v1/messages in setup |
| Skip Jim coverage | Same as Mailpit Step 5; misses resilience | Enable Jim or migrate to Mailpit Chaos |

## Limitations

- MailHog has not had significant new releases since ~2020;
  unmaintained for new features.
- APIv2 is the modern API but APIv1 is required for the message-clear
  operation (no APIv2 equivalent); awkward inconsistency.
- Jim chaos-monkey configuration is less rich than Mailpit's Chaos
  mode.
- Some Docker images on Docker Hub may be unmaintained; verify the
  pulled image was built recently.

## References

- [mh-gh][mh-gh] - repository
- mailhog/MailHog APIv2 docs - github.com/mailhog/MailHog/blob/master/docs/APIv2.md
- [migrating-to-mailpit.md](migrating-to-mailpit.md) - feature mapping + cutover steps
- The host SKILL.md (Mailpit) - successor; preferred for new projects
- [email-flows.md](email-flows.md) - the full email-sending workflow
  (works with either Mailpit or MailHog)
