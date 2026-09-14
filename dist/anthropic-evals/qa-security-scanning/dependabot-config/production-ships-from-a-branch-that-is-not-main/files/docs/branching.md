# Branching policy (revised 2026-05-11)

- `main` is the repository default branch. It carries 4.0 work only.
- `release/3.2` is the production branch. Every deploy since 2026-05-11 has
  been built from it.
- `release/3.2` cannot be rebuilt from `main`: 4.0 includes an irreversible
  ledger migration that 3.2 cannot read.
- Fixes that must reach production are landed on `main` first, then
  cherry-picked to `release/3.2` by the on-call engineer and released as a
  3.2.x patch. Median time from merge on `main` to release: 2 days.
- Nothing merges directly into `release/3.2` without a cherry-pick reference in
  the commit body. Branch protection enforces this.
