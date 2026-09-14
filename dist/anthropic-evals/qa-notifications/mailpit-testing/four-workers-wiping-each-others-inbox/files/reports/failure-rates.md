# Email test failure rates, 120 runs before the concurrency change vs 86 after

| test                                               | serial (120) | 4 workers (86) |
|----------------------------------------------------|--------------|----------------|
| password reset email contains a reset link         | 0.0%         | 31.4%          |
| password reset email is addressed to the requester | 0.0%         | 29.1%          |
| welcome email greets the new user                  | 0.0%         | 26.7%          |
| welcome email is sent from the no-reply address    | 0.0%         | 34.9%          |

Wall clock for the whole job: 22m04s serial, 6m11s at four workers.

Across those 86 runs `welcome email is sent from the no-reply address` also
ended with `TypeError: Cannot read properties of undefined (reading 'From')`
seven times instead of an assertion failure.

## What a search result looks like on this container

Captured by hand against the same image, one welcome message in the mailbox,
pretty-printed:

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
