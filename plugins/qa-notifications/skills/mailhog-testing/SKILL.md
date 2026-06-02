---
name: mailhog-testing
description: "Configures and runs MailHog - legacy dev mailbox preceding Mailpit; SMTP `1025` + HTTP UI `8025`; Go-based single binary or Docker; APIv2 (`/api/v2/messages`, `/api/v2/search`); Jim chaos-monkey toggle for failure injection. Use when the user maintains an existing MailHog setup; for new projects prefer [`mailpit-testing`](../mailpit-testing/SKILL.md) (richer API, active maintenance). Migration path documented in body."
rating: 21
d6: 4
archetype: S1
---

# mailhog-testing

## Overview

Per [github.com/mailhog/MailHog][mh-gh]:

[mh-gh]: https://github.com/mailhog/MailHog

> "MailHog is an email testing tool for developers" that allows you
> to "Configure your application to use MailHog for SMTP delivery"
> and "View messages in the web UI, or retrieve them with the JSON
> API."

MailHog is **legacy** as of the mid-2020s - Mailpit (per
[`mailpit-testing`](../mailpit-testing/SKILL.md)) succeeded it with
richer API + active maintenance. This skill covers MailHog for
existing deployments + provides migration guidance to Mailpit.

## When to use

- Existing MailHog deployment that the team isn't ready to migrate.
- A specific MailHog feature behaves differently than Mailpit's
  equivalent (rare; investigate before assuming MailHog-specific
  behavior is required).
- Tests already wired against MailHog's APIv2 + the team needs to
  document what the tests do before migration.

For new projects, use [`mailpit-testing`](../mailpit-testing/SKILL.md).

## Step 1 - Install

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

## Step 2 - Default ports

Per [mh-gh][mh-gh]:

| Port | Service |
|---|---|
| 1025 | SMTP server |
| 8025 | HTTP server (UI + APIv1 + APIv2) |

## Step 3 - Configure your app's SMTP

Same pattern as Mailpit (since both expose unauthenticated SMTP on
1025 by default):

```yaml
smtp:
  host: localhost
  port: 1025
  auth: none
```

## Step 4 - Assert via APIv2

Per [mh-gh][mh-gh] MailHog has both APIv1 + APIv2; APIv2 is the
modern one. Endpoints:

| Endpoint | Use |
|---|---|
| `GET /api/v2/messages` | List captured messages (paginated) |
| `GET /api/v2/messages?limit=N&start=M` | Pagination |
| `GET /api/v2/search?kind=to&query=alice@x.com` | Search by recipient / subject / containing |
| `DELETE /api/v1/messages` | Clear all messages (uses APIv1; APIv2 has no delete) |

Test pattern:

```python
import requests

BASE = "http://localhost:8025"

def test_password_reset_via_mailhog():
    requests.delete(f"{BASE}/api/v1/messages")
    trigger_password_reset("alice@example.com")
    msg = poll_for_message(BASE, to="alice@example.com")

    assert msg["Content"]["Headers"]["Subject"][0] == "Reset your password"
    assert "/reset?token=" in msg["Content"]["Body"]
```

The MailHog message structure is more nested than Mailpit's
(`Content.Headers.Subject` array vs Mailpit's flat `Subject` field).

## Step 5 - Jim chaos monkey

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
(per [`mailpit-testing`](../mailpit-testing/SKILL.md) Step 5) - it
has richer per-recipient configuration.

## Step 6 - CI integration

```yaml
services:
  mailhog:
    image: mailhog/mailhog
    ports: [1025:1025, 8025:8025]

steps:
  - run: pytest tests/integration/email/ -v
```

## Step 7 - Migration to Mailpit

Side-by-side feature mapping:

| MailHog | Mailpit equivalent |
|---|---|
| SMTP on `1025` | SMTP on `1025` (same) |
| HTTP UI on `8025` | Web UI on `8025` (same) |
| `GET /api/v2/messages` | `GET /api/v1/messages` (path differs; flat schema) |
| `GET /api/v2/search?kind=to&query=...` | `GET /api/v1/search?query=to:...` (Lucene-ish syntax) |
| `mailhog -invite-jim` | Chaos mode (richer per-recipient config) |

Migration steps:

1. Stand up Mailpit alongside MailHog (different ports temporarily).
2. Update test code to hit Mailpit's endpoints + flatter schema.
3. Run both in CI parallel for one PR cycle.
4. Cut over.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Start new project on MailHog | Legacy; loses richer Mailpit features | Use Mailpit (Step 7 + cross-skill) |
| Use APIv1 for new test code | Deprecated by APIv2 (within MailHog) | APIv2 endpoints (Step 4) |
| Assume MailHog flat schema | MailHog's `Content.Headers.Subject` is an array | Walk the nested structure (Step 4) |
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
- [`mailpit-testing`](../mailpit-testing/SKILL.md) - successor;
  preferred for new projects
- [`email-flow-test-author`](../email-flow-test-author/SKILL.md) - 
  build-an-X for the full email-sending workflow (works with either
  Mailpit or MailHog)
