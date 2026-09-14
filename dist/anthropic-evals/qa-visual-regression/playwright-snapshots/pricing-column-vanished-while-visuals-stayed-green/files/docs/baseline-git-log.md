# `git log --format='%h %ad %s' --date=short -- tests/pricing.spec.ts-snapshots/ tests/analytics.spec.ts-snapshots/`

```
d1c4e77 2026-09-02  chore: refresh pricing baselines, job was noisy again (PR #2098)
9a30b12 2026-08-11  feat: new plan tier row in the comparison table
771e0ab 2026-07-15  chore: baselines after tolerance change (PR #2044)
5fd8c31 2026-07-02  chore: baselines after tolerance change (PR #2011)
2bb90ad 2026-06-24  chore: baselines after tolerance change (PR #1962)
```

PR #2098 body, in full: "Visual job flagged pricing twice this week, both
re-ran green afterwards. Refreshed the pricing baselines so it stops. No
source changes."

`usage-chart.png` has not been rewritten since 2026-06-24.
