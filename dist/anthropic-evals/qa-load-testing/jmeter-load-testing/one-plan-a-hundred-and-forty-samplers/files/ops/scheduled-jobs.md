# Scheduled jobs that call the endpoints the load suite covers

| Job               | Runs at     | Calls                                                                  | Deadline                            |
|-------------------|-------------|------------------------------------------------------------------------|-------------------------------------|
| settlement-upload | 16:30 daily | `GET /reporting/export`, once per ledger partition, 48 partitions, run one after another | file must be with the bank by 17:00 |
| ledger-snapshot   | 02:00 daily | `GET /reporting/ledger`, 4 calls                                        | none                                |
| session-reaper    | hourly      | `POST /auth/token`, 1 call                                              | none                                |
| card-sync         | 05:00 daily | `GET /checkout/methods`, 1 call                                         | none                                |
| search-warm       | 04:00 daily | `GET /search`, `GET /search/facets`, 200 calls each                     | none                                |

`GET /admin/audit-log`, `GET /admin/users` and `POST /checkout/cart` have no
scheduled consumers. They are called when somebody opens the corresponding
screen.
