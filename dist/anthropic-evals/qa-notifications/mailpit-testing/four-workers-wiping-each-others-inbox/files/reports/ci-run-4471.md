# integration run #4471 — four workers, worker output and mail-container log interleaved by timestamp

Failure rate by test, 120 runs before the concurrency change vs 86 runs after:

| test                                             | serial (120) | 4 workers (86) |
|--------------------------------------------------|--------------|----------------|
| password reset email contains a reset link        | 0.0%         | 31.4%          |
| password reset email is addressed to the requester | 0.0%        | 29.1%          |
| welcome email greets the new user                 | 0.0%         | 26.7%          |
| welcome email is sent from the no-reply address   | 0.0%         | 34.9%          |

Wall clock for the whole job: 22m04s serial, 6m11s at four workers.

Across those 86 runs the no-reply test also produced
`TypeError: Cannot read properties of undefined (reading 'From')` seven times.

## Failure 1 — "password reset email contains a reset link" (worker 2)

```
14:02:11.104 w2    POST /_test/trigger-password-reset  qa@example.com        -> 202
14:02:11.109 w1    DELETE /api/v1/messages                                   -> 200
14:02:11.240 mail  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:11.311 w2    GET /api/v1/search?query=to%3Aqa%40example.com            -> 200  1 message  ID=8f2c1ad4-...
14:02:11.404 w3    DELETE /api/v1/messages                                   -> 200
14:02:11.407 w2    GET /api/v1/message/8f2c1ad4-...                          -> 404
14:02:11.408 w2    FAIL  Error: fetch 8f2c1ad4-... failed: 404
```

## Failure 2 — "welcome email greets the new user" (worker 4)

```
14:02:19.880 w4    POST /_test/trigger-welcome  newuser@example.com          -> 202
14:02:19.883 mail  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:19.884 w1    DELETE /api/v1/messages                                   -> 200
14:02:19.982 w4    GET /api/v1/search?query=to%3Anewuser%40example.com       -> 200  0 messages
14:02:20.083 w4    GET /api/v1/search?query=to%3Anewuser%40example.com       -> 200  0 messages
     ... 46 more polls, all 0 messages ...
14:02:24.887 w4    FAIL  Error: timed out after 5000ms waiting for mail to newuser@example.com
```

## Failure 3 — "welcome email is sent from the no-reply address" (worker 4)

```
14:02:31.550 w4    POST /_test/trigger-welcome  newuser@example.com          -> 202
14:02:31.640 w2    POST /_test/trigger-password-reset  qa@example.com        -> 202
14:02:31.701 mail  [smtp] message from <noreply@example.com> to <newuser@example.com> accepted (4.4 kB)
14:02:31.744 mail  [smtp] message from <security@example.com> to <qa@example.com> accepted (3.1 kB)
14:02:31.800 w4    GET /api/v1/messages                                      -> 200  2 messages
14:02:31.801 w4    FAIL  AssertionError: expected 'noreply@example.com', got 'security@example.com'
```

## What a search result actually looks like

Captured by hand against the same container image, one welcome message in the
mailbox, pretty-printed:

```
$ curl -s 'http://localhost:8025/api/v1/search?query=to%3Anewuser%40example.com' | jq '.messages[0]'
{
  "ID": "3c91e7be-5a11-4f2d-9a70-1d0e2f4b88c1",
  "MessageID": "20260803140219.2f1a@harbour",
  "Read": false,
  "From": { "Name": "Harbour", "Address": "noreply@example.com" },
  "To": [ { "Name": "Nadia Okonjo", "Address": "newuser@example.com" } ],
  "Cc": [],
  "Bcc": [],
  "Subject": "Welcome to Harbour",
  "Created": "2026-08-03T14:02:19.883Z",
  "Tags": [],
  "Size": 4438,
  "Attachments": 0,
  "Snippet": "Welcome to Harbour, Nadia. Your workspace is ready and your teammates Ivo and Priya are already in it. There is nothing to install. When you are ready to pick up where the tour left off, sign in h…"
}
```

The sign-in URL the support lead wants checked sits a further two paragraphs
down in the plain-text part. It is not in what is printed above.
