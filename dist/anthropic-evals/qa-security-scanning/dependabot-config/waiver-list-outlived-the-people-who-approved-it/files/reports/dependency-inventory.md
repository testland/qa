# Installed versions, 2026-09-08

| Package   | Installed | Latest on our major | Latest overall |
|-----------|-----------|---------------------|----------------|
| `react`   | 18.3.1    | 18.3.1              | 19.2.0         |
| `express` | 4.17.1    | 4.21.2              | 5.1.0          |
| `axios`   | 0.27.2    | 0.27.2              | 1.8.4          |
| `lodash`  | 4.17.20   | 4.17.21             | 4.17.21        |
| `sharp`   | 0.32.6    | 0.32.6              | 0.34.1         |
| `django`  | 4.2.16    | 4.2.23              | 5.1.6          |
| `boto3`   | 1.34.51   | 1.34.162            | 1.40.7         |

Roster and provenance, gathered for the audit:

- `alice@acme.com` and `marta@acme.com` are current employees.
- `dmitri@acme.com` left the company on 2025-06-30. No successor is named on
  any entry he signed.
- `git blame` dates the two unannotated npm entries to 2024-02-14 and the
  `boto3` entry to 2025-03-19. None of the three carries a ticket reference.
- PLAT-2210 (router rewrite) is open, unestimated, not on any sprint.
- PLAT-2211 (base image upgrade) is open and in the current sprint.
- `boto3` releases a patch most working days.
- No dependency in this table has been upgraded by a bot pull request since
  2025-12; everything moving has moved by hand.
