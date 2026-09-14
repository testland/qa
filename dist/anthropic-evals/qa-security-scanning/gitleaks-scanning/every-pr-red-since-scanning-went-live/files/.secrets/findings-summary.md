# First scan, 2026-09-08 — summary of all 214 findings

| Year the commit was authored | Findings |
|---|---|
| 2019 | 44 |
| 2020 | 61 |
| 2021 | 38 |
| 2022 | 29 |
| 2023 | 26 |
| 2024 | 9 |
| 2025 | 5 |
| 2026 (Jan–Aug) | 0 |
| 2026 (Sept, this month) | 2 |

The two September records are the first two rows of
`.secrets/findings-excerpt.json`. `services/checkout/.env.staging` and
`infra/bootstrap.sh` both still exist on `main` at HEAD with those lines
present. The credential register has no rotation entries for either.
