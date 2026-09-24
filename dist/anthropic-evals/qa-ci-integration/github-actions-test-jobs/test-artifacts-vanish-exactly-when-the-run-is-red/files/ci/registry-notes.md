# ghcr.io/ledger/ledger-api - who pulls what

| Tag         | Pulled by                                                      |
|-------------|----------------------------------------------------------------|
| `pr-<n>`    | Reviewers, by hand, to poke at a branch. Nothing polls it.      |
| `:latest`   | The staging cluster, on a ten-minute reconcile loop. Also the   |
|             | `ledger-cli` install script's default, and the two internal     |
|             | services that bring us up in their docker-compose files.        |

Whatever `:latest` points at is running in staging within ten minutes and is
what a new engineer gets when they follow the setup guide. It is moved by
`scripts/promote-latest.sh`, which retags the image already pushed for this
commit; it has no checks of its own.
