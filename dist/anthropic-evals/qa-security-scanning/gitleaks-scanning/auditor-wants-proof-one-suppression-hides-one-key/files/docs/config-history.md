# `git log --oneline -- .gitleaks.toml`

```
7c04e18 2026-04-02  i.petrov     scanning: stop the SDK fixture stripe key firing
3d5b7f2 2026-01-09  s.delacroix  scanning: initial config
```

# `git log --oneline --since=2026-03-01 -- tests/fixtures/ docs/runbooks/`

```
(no commits)
```

Scanner version pinned at v8.24.2 in `.github/workflows/secret-scan.yml` since
2026-01-09; unchanged. `tests/fixtures/checkout-live-replay.json` and
`docs/runbooks/oncall.md` are both present at HEAD with those lines intact.
No rotation entries exist in the credential register for 2025 or 2026.
