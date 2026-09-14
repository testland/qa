# Bot pull request volume, 2026-08-25 to 2026-09-07 (14 days)

| Block             | PRs opened | Merged | Closed unmerged | Still open |
|-------------------|-----------:|-------:|----------------:|-----------:|
| npm `/`           |        214 |    171 |              19 |         24 |
| npm `/apps/admin` |        138 |     96 |              17 |         25 |
| github-actions    |         31 |     31 |               0 |          0 |
| docker            |         14 |     11 |               3 |          0 |
| terraform         |         19 |     14 |               2 |          3 |
| gomod             |          0 |      0 |               0 |          0 |

Of the 214 npm PRs on the root block, 168 were dev dependencies (eslint plugins,
types packages, test tooling). 31 of the 31 Actions PRs were a version bump to
one of five actions we use in every workflow.

Separately, 6 pull requests in this window were raised by the security update
feature rather than by the scheduled version updates: 4 on the `/services/api`
Docker image (alpine `libcrypto3`, `openssl`, `busybox`, `libssl3`) and 2 on
npm. All 6 were merged. They are not included in the table above.

Both npm blocks have been sitting at their open pull request ceiling for most
of the two weeks.
