---
name: mailpit-testing
description: "Use whenever code sends email and tests must check it: capture messages in Mailpit's local SMTP server (port 1025) and assert on them through its REST API, test SMTP failures with chaos mode, follow multipart, link, unsubscribe and bounce flows, or migrate from MailHog."
---

# mailpit-testing

## Overview

Mailpit is an SMTP server for tests: it captures every message the app
sends, shows it in a web UI and exposes it through a REST API, and its
Chaos feature returns configurable SMTP errors for resilience tests
([docs][mp-docs]). It never delivers mail.

## When to use

- The app sends transactional email (password reset, sign-in links,
  notifications) and tests must assert on what was sent.
- Retry and dead-letter code needs real SMTP errors (Chaos, Step 5).
- The full flow needs coverage beyond capture (headers, multipart,
  links, unsubscribe, bounces):
  [references/email-flows.md](references/email-flows.md).
- An existing MailHog setup is being replaced:
  [references/migrating-to-mailpit.md](references/migrating-to-mailpit.md).

## Step 1 - Run it

```bash
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit:v1.32
# or: brew install mailpit && mailpit
```

SMTP listens on 1025 and the web UI / API on 8025 ([repository][mp-gh]).
Pin an image tag; the API changes between releases. Prefer the image or
a release binary over the repository's install script, which pipes
remote code into a root shell.

**Check it is up before any test:**

```bash
curl -fsS http://localhost:8025/api/v1/info   # 200 with version and message count
```

## Step 2 - Point the app at it

| Stack | Setting |
|---|---|
| Django | `EMAIL_HOST=localhost`, `EMAIL_PORT=1025` |
| Spring | `spring.mail.host=localhost`, `spring.mail.port=1025` |
| Rails | `smtp_settings: { address: "localhost", port: 1025 }` |
| Nodemailer | `createTransport({ host: "localhost", port: 1025 })` |

Mailpit accepts unauthenticated SMTP by default ([SMTP options][mp-smtp]).
If production uses SMTP auth, test it for real: start Mailpit with
`--smtp-auth-file <file> --smtp-auth-allow-insecure` and add a test that
a wrong password is rejected. Never use `--smtp-auth-accept-any` for
that: it accepts any username and password, or none, so a broken
credential still passes ([SMTP options][mp-smtp]).

## Step 3 - Give each test its own address

Tests that share one mailbox and clear it with `DELETE /api/v1/messages`
delete each other's mail when they run in parallel. Instead, send each
test to a unique plus-address. Plus-addressing tags are on by default:
`alice+t-3f9a@example.com` gets the tag `t-3f9a` ([tagging][mp-tag]).

```python
# tests/email/mailpit.py
import time, uuid, requests

BASE = "http://localhost:8025"

def unique_address(local="alice", domain="example.com"):
    return f"{local}+t-{uuid.uuid4().hex[:8]}@{domain}"

def wait_for_message(to, timeout=5.0):
    """Poll search scoped to one recipient; return the full message."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        found = requests.get(f"{BASE}/api/v1/search",
                             params={"query": f'to:"{to}"'}, timeout=2).json()
        if found["messages"]:
            msg_id = found["messages"][0]["ID"]
            return requests.get(f"{BASE}/api/v1/message/{msg_id}", timeout=2).json()
        time.sleep(0.1)
    raise AssertionError(f"no message to {to} within {timeout}s")

def delete_messages_to(to):
    requests.delete(f"{BASE}/api/v1/search", params={"query": f'to:"{to}"'}, timeout=2)
```

`GET /api/v1/search` and `DELETE /api/v1/search` take the same search
query, so a test only ever reads or deletes its own messages
([API][mp-api]). Clean up in teardown with `delete_messages_to`, or not
at all; never with an unscoped delete on a parallel path.

## Step 4 - Assert on the full message

```python
import re

def test_password_reset_email():
    to = unique_address()
    trigger_password_reset(to)              # the app call under test
    msg = wait_for_message(to)

    assert msg["Subject"] == "Reset your password"
    assert msg["To"][0]["Address"] == to
    assert msg["From"]["Address"] == "no-reply@example.com"
    m = re.search(r"/reset\?token=([A-Za-z0-9_-]{20,})", msg["Text"])
    assert m, "reset link with a real token missing from the text part"
    assert m.group(1) != "undefined"
```

`GET /api/v1/message/{ID}` (singular) returns `Subject`, `From`, `To`,
`Text` and `HTML` ([API][mp-api]). Assert on extracted values directly:
an assertion inside a loop over links passes when the list is empty.
Message IDs are generated per send, so never hard-code one.

## Step 5 - Chaos: real SMTP errors

Start Mailpit with Chaos enabled (`--enable-chaos`, or
`--chaos-triggers Sender:451:100` to set a trigger at startup)
([Chaos][mp-chaos]). Then set triggers per test through the API:

```python
def set_chaos(**triggers):
    # e.g. set_chaos(Recipient={"ErrorCode": 451, "Probability": 100})
    r = requests.put(f"{BASE}/api/v1/chaos", json=triggers, timeout=2)
    r.raise_for_status()

def test_transient_error_is_retried():
    to = unique_address()
    set_chaos(Recipient={"ErrorCode": 451, "Probability": 100})
    try:
        send_notification(to)                # app should queue a retry
        assert_retry_scheduled(to)
    finally:
        set_chaos()                          # {} resets every trigger to 0%
    run_retry_worker()
    assert wait_for_message(to)["Subject"]
```

`PUT /api/v1/chaos` takes `Sender`, `Recipient` and `Authentication`
triggers, each with `ErrorCode` (400-599) and `Probability` (0-100);
omitted triggers reset to 0%, and the route errors if Chaos is not
enabled ([API][mp-api]). Cover 4xx (retry with backoff) and 5xx (stop
after one attempt) separately. Chaos is server-wide, so run Chaos tests
in their own job or serially. A provider bounce webhook is a different
event; see [references/email-flows.md](references/email-flows.md).

## Step 6 - CI

```yaml
services:
  mailpit:
    image: axllent/mailpit:v1.32
    ports: ["1025:1025", "8025:8025"]
    env:
      MP_ENABLE_CHAOS: "true"
steps:
  - run: curl --retry 10 --retry-connrefused -fsS http://localhost:8025/api/v1/info
  - run: pytest tests/email -n 4
    env: { SMTP_HOST: localhost, SMTP_PORT: "1025" }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Unscoped `DELETE /api/v1/messages` in `beforeEach` | Parallel workers delete each other's mail | Unique address per test, scoped search delete (Step 3) |
| Fixed sleep, then read the newest message | Reads another test's mail or nothing | Poll search scoped to the recipient (Step 3) |
| `--smtp-auth-accept-any` | Any credential passes; auth bugs ship | Real auth file + wrong-password test (Step 2) |
| Hard-coded message IDs | IDs are generated per send | Search by recipient (Step 3) |
| Assertions only inside a loop over extracted links | Empty capture passes | Assert on the extracted value (Step 4) |
| Only the happy path | Retry / dead-letter code untested | Chaos (Step 5) |

## Limitations

- Mailpit does NOT actually deliver email - it only captures. For
  end-to-end deliverability tests, use a real-mail-with-test-domain
  service (Mailtrap, Mailosaur).
- Some advanced SMTP features (DKIM signing assertion, SPF lookup)
  are not Mailpit's focus; verify via separate tooling.
- The REST API surface evolves between Mailpit releases; pin a
  specific tag in CI (`axllent/mailpit:v1.32`, not `:latest`).

## References

- [Mailpit documentation][mp-docs] - features, Chaos, REST API.
- [Repository][mp-gh] - install options, default ports.
- [Docker image][mp-docker] - image and tags.
- [REST API][mp-api] - `/api/v1/info`, `/api/v1/search` (GET and DELETE), `/api/v1/message/{ID}`, `/api/v1/chaos`.
- [SMTP options][mp-smtp] - unauthenticated default, `--smtp-auth-file`, `--smtp-auth-allow-insecure`, `--smtp-auth-accept-any`.
- [Tagging][mp-tag] - plus-address tags on by default.
- [Chaos][mp-chaos] - `--enable-chaos`, `--chaos-triggers`.
- End-to-end email-flow workflow (headers, multipart, links,
  unsubscribe, bounces): [references/email-flows.md](references/email-flows.md)
- MailHog (legacy) capture + migration:
  [references/mailhog-legacy.md](references/mailhog-legacy.md) and
  [references/migrating-to-mailpit.md](references/migrating-to-mailpit.md)

[mp-docs]: https://mailpit.axllent.org/docs/
[mp-gh]: https://github.com/axllent/mailpit
[mp-docker]: https://hub.docker.com/r/axllent/mailpit
[mp-api]: https://mailpit.axllent.org/docs/api-v1/
[mp-smtp]: https://mailpit.axllent.org/docs/configuration/smtp/
[mp-tag]: https://mailpit.axllent.org/docs/usage/tagging/
[mp-chaos]: https://mailpit.axllent.org/docs/integration/chaos/
