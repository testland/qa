# `git log --follow --oneline -- deploy/legacy/bootstrap-key.pem`

```
2ff41c6 2021-08-14  dmori   deploy: bootstrap key for the legacy estate
```

One commit. The file is still on `main` at that path, unchanged.

# `git log --follow --oneline -- services/ledger/config/dev.yaml services/ledger/config/staging.yaml`

```
7b9e013 2024-09-30  aokafor  ledger: split dev and staging config
```

Both files are still on `main`, unchanged since 2024.

# `git log --oneline --since=2026-08-01 -- ops/alerting/relay.py`

```
8f3ca21 2026-08-06  pnaidu   alerting: read the bot token from Vault, drop the literal
```

# `git log --oneline --since=2026-08-01 -- .gitleaks.toml scripts/`

```
d40b917 2026-08-19  mreyes   PLAT-4471: detect internal svc_ tokens and NVKEY envelopes
```

Nothing else touched the scanner config or the scripts directory this quarter,
and no files were deleted from `deploy/` or `services/` this year.
