# `git show --stat b93d0c7`

```
commit b93d0c7f1e4a9c05d3b2718a6f0c9d4e5b1a7c33
Author:    Hana Sorensen <h.sorensen@atlasmail.io>
Commit:    Hana Sorensen <h.sorensen@atlasmail.io>
Date:      2026-09-11T16:48:02Z
Message:   notify: put the key in the sample so on-call can read it off main
Parents:   d51c9ee

 services/notify/mailer.env.sample | 1 +
 1 file changed, 1 insertion(+)
```

## Hana's workstation, checked 2026-09-13 with her sitting next to me

| Check | Result |
|---|---|
| `.git/hooks/pre-commit` present and current | yes, written 2026-07-14, unmodified |
| `pre-commit --version` | 4.0.1 |
| Hook environment resolves gitleaks to | v8.24.2 — the pinned revision |
| `git config core.hooksPath` | unset |
| `PRE_COMMIT_ALLOW_NO_CONFIG` / `SKIP` in her environment | unset |
| Shell history for that commit | plain `git commit -m …`, no `--no-verify` |
| Commit made through a browser or any web UI | no — local commit, her machine, her ssh key |

She says she did not see the hook print anything unusual, but she also says she
was on the bridge call and was not watching the terminal.

## PR #1187 review thread, 2026-08-28, m.oyelaran

> the hook stops me on `tests/fixtures/sendgrid-replay.json` every single time I
> touch that file, it is a made-up value, SEC-311 says so. pushing with
> `--no-verify` again so I can get this out before the freeze
