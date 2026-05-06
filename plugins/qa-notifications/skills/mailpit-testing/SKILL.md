---
name: mailpit-testing
description: Configures and runs Mailpit — modern dev-mailbox server for SMTP testing with built-in REST API for assertions; default SMTP `1025` + Web UI `8025`; ships single static binary or multi-architecture Docker images; features Chaos mode (configurable SMTP errors for resilience testing), message tagging (manual + auto via filters and plus-addressing), search filters. Use when the user develops email-sending code locally / in CI and needs SMTP capture with programmatic test assertions, or when migrating from MailHog (which Mailpit succeeds).
rating: 23
d6: 4
archetype: S1
---

# mailpit-testing

## Overview

Per [mailpit.axllent.org/docs/][mp-docs]:

[mp-docs]: https://mailpit.axllent.org/docs/

> "Mailpit is packed full of features for developers wanting to test
> SMTP and emails. It acts as an SMTP server, provides a modern web
> interface to view & test intercepted emails."

Per [mp-docs][mp-docs] the differentiated features:

- "Chaos feature to enable configurable SMTP errors for testing
  application resilience."
- "Message tagging, including manual tagging or automated tagging
  using filtering and 'plus addressing'."
- "A REST API for integration testing"

Mailpit succeeded MailHog as the de facto OSS dev mailbox in the
mid-2020s; new projects start with Mailpit by default.

## When to use

- The repo has email-sending code (transactional emails, password
  reset, notifications) that needs local + CI testing.
- Tests assert on captured email content (subject, body, headers,
  attachments).
- The team needs Chaos mode to test app resilience to SMTP errors
  (bounce, timeout, rate-limit).
- Migrating from MailHog (Mailpit is API-compatible at the SMTP
  layer + has a richer REST API).

## Step 1 — Install

Per [github.com/axllent/mailpit][mp-gh]:

[mp-gh]: https://github.com/axllent/mailpit

```bash
# macOS
brew install mailpit

# Linux + macOS via install script
sudo sh < <(curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh)

# Custom install path
sudo INSTALL_PATH=/usr/bin sh < <(curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh)
```

Docker is the recommended path for CI; consult [mp-gh][mp-gh] for
current Docker pull commands.

## Step 2 — Start

Per [mp-gh][mp-gh]:

> "The Mailpit web UI listens by default on `http://0.0.0.0:8025`
> and the SMTP port on `0.0.0.0:1025`."

Foreground:

```bash
mailpit
# Web UI: http://localhost:8025
# SMTP:   localhost:1025
```

As a background service on macOS:

```bash
brew services start mailpit
```

Discover all options:

```bash
mailpit -h
```

## Step 3 — Configure your app's SMTP

Point the application's SMTP config at Mailpit:

```yaml
# example: Rails action_mailer config
smtp_settings:
  address: localhost
  port: 1025
  domain: localhost
  authentication: nil   # Mailpit accepts unauthenticated SMTP by default
```

Equivalent envs work for Django (`EMAIL_HOST=localhost`,
`EMAIL_PORT=1025`), Spring (`spring.mail.host=localhost`,
`spring.mail.port=1025`), Node nodemailer, etc.

## Step 4 — Assert via REST API

Per [mp-docs][mp-docs] Mailpit ships a "REST API for integration
testing." The canonical endpoints (consult [mp-docs][mp-docs] for
current paths per release) follow this shape:

```python
import requests

BASE = "http://localhost:8025"

def test_password_reset_sends_email():
    # 1. Clear inbox before the test
    requests.delete(f"{BASE}/api/v1/messages")

    # 2. Trigger the email send
    trigger_password_reset("alice@example.com")

    # 3. Poll until the email lands (typical: <1s)
    msg = poll_for_message(BASE, to="alice@example.com", timeout=5)

    # 4. Assert
    assert msg["Subject"] == "Reset your password"
    assert "/reset?token=" in msg["Text"]
    assert msg["To"][0]["Address"] == "alice@example.com"
```

```python
def poll_for_message(base, to, timeout):
    import time
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = requests.get(f"{base}/api/v1/search", params={"query": f"to:{to}"})
        messages = response.json().get("messages", [])
        if messages:
            return requests.get(f"{base}/api/v1/message/{messages[0]['ID']}").json()
        time.sleep(0.1)
    raise AssertionError(f"No email to {to} within {timeout}s")
```

The exact endpoint paths may evolve — always check the live API
schema at `http://localhost:8025/api/v1/` (Mailpit ships an
OpenAPI schema for self-introspection).

## Step 5 — Chaos mode

Per [mp-docs][mp-docs]: "Chaos feature to enable configurable SMTP
errors for testing application resilience."

Use cases for app-level resilience testing:

- Verify retry-with-backoff works when SMTP returns 421 / 451
- Verify dead-letter handling for permanent failures (5xx)
- Verify rate-limit handling (server returns 421 4.7.0)

Per [mp-docs][mp-docs], Chaos is configurable per-recipient or
globally; consult the live docs for current Chaos API shape.

## Step 6 — Tagging + plus-addressing

Per [mp-docs][mp-docs]: "automated tagging using filtering and
'plus addressing'."

Pattern for test-isolation: each test sends to
`alice+test-${test_id}@example.com`; Mailpit auto-tags by the
`+test-...` suffix; tests filter by tag to isolate their email
batch from concurrent test runs:

```python
import uuid
test_id = uuid.uuid4().hex[:8]
to_addr = f"alice+test-{test_id}@example.com"
trigger_email(to_addr)
msg = requests.get(
    f"{BASE}/api/v1/search",
    params={"query": f'tag:"test-{test_id}"'},
).json()["messages"][0]
```

## Step 7 — CI integration

```yaml
services:
  mailpit:
    image: axllent/mailpit:latest
    ports: [1025:1025, 8025:8025]

steps:
  - run: pytest tests/integration/email/ -v
    env:
      SMTP_HOST: localhost
      SMTP_PORT: 1025
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip per-test inbox clear | Stale messages cause false-positives | DELETE /api/v1/messages in setup (Step 4) |
| Assume Mailpit handles authenticated SMTP | Default config is unauthenticated; auth tests need explicit config | Configure `--smtp-auth-allow-insecure` or proper auth config |
| Hardcode message IDs in tests | IDs are random per send; tests fail | Search by recipient/subject (Step 4) |
| Skip polling; assert immediately | Sub-second SMTP delivery isn't guaranteed | Poll with timeout (Step 4) |
| Test only happy path | Misses retry/dead-letter scenarios | Use Chaos mode (Step 5) |

## Limitations

- Mailpit does NOT actually deliver email — it only captures. For
  end-to-end deliverability tests, use a real-mail-with-test-domain
  service (Mailtrap, Mailosaur).
- Some advanced SMTP features (DKIM signing assertion, SPF lookup)
  are not Mailpit's focus; verify via separate tooling.
- The REST API surface evolves between Mailpit releases; pin a
  specific version in CI (`axllent/mailpit:v1.20.0` not `:latest`).

## References

- [mp-docs][mp-docs] — official documentation
- [mp-gh][mp-gh] — repository, install commands, ports
- mailpit.axllent.org/docs/api-v1/ — REST API reference
- [`mailhog-testing`](../mailhog-testing/SKILL.md) — predecessor; use
  Mailpit for new work
- [`email-flow-test-author`](../email-flow-test-author/SKILL.md) —
  build-an-X for the full email-sending workflow
