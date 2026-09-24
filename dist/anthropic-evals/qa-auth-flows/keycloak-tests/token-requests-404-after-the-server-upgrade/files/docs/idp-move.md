# Identity server move, 2026-08

| | Before | Now |
|---|---|---|
| Where | `sso-vm-01`, maintained by ops | containers; one per test run for the suite, a managed deployment for staging and prod |
| Version | frozen since 2022 | whatever the release channel is on; staging is on 26.x today |
| Who can change it | ops ticket, 3-5 days | us, in the repo |
| Realm definition | maintained by hand in the admin console | `fixtures/test-realm.json`, reviewed against the staging realm each quarter |

Notes from the migration:

- Ops stood the new deployments up on defaults; nothing was overridden.
- `tests/auth/urls.py` predates the move. It was written against `sso-vm-01` and
  the only thing touched during the move was `BASE`, which used to be the VM's
  hostname.
- `test_server_answers` was added during the move to prove the container itself
  was coming up, because early on it was not.
