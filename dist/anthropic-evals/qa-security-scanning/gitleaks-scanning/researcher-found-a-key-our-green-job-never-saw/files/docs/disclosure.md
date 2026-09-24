# Coordinated disclosure — received 2026-09-10 09:12 UTC

> While reviewing forks of public repositories I found an AWS access key id and
> secret in the git history of `hexley/edge-router`. The values appear at
> `services/billing/config/prod.env.sample` lines 11-12, introduced in commit
> `4f1c9ab`. The file no longer exists at HEAD but the blob is reachable from
> history and from at least one fork. I have not used the credential.
> — R. Sandoval

## What we established on 2026-09-10

- `4f1c9ab` authored 2026-02-18T11:04:19Z by `d.whitfield`. Message: "billing:
  sample env for the prod router rollout".
- `a77e3d1` authored 2026-03-04T15:41:02Z by `l.tanaka`, deleted the whole
  `services/billing/config/` directory as part of a cleanup. The file has not
  existed at HEAD since.
- The secret-scan job was added in PR #2210, merged 2026-03-20. First run the
  same day. 1,412 runs since, all green, none skipped, none cancelled.
- The key is `AKIA[REDACTED]`, IAM user `edge-router-billing`, created
  2024-11-03, **still Active**. Console shows `LastUsedDate 2026-09-12`,
  service `s3`, region `eu-central-1`.
- Our nightly warehouse export authenticates as `edge-router-billing` against
  `s3` in `eu-central-1`. It has run every night since 2024-11.
- CloudTrail retention on this account is 400 days, so 2026-02-18 onward is
  queryable.
- `hexley/edge-router` is public. GitHub reports **61 forks**, and the repo is
  mirrored to our internal GitLab and to two archive services.
