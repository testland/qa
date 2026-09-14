# acme/orchard - every manifest in the repo, 2026-09-08

| Manifest                            | Contents                                            | Last bot pull request |
|-------------------------------------|-----------------------------------------------------|-----------------------|
| `/package.json`                     | workspace root: no runtime deps, 12 dev deps        | never                 |
| `/packages/web/package.json`        | 38 runtime deps, 22 dev deps                        | never                 |
| `/packages/api/package.json`        | 44 runtime deps, 19 dev deps                        | never                 |
| `/packages/jobs/package.json`       | 21 runtime deps, 8 dev deps                         | never                 |
| `/services/ranker/requirements.txt` | 43 pinned deps: Django 4.2.11, `requests`, `cryptography`, 40 others | 2026-03-06 |
| `/infra/main.tf`                    | 5 providers, pinned at 2025-11 versions             | never                 |
| `/services/media/Dockerfile`        | `FROM python:3.12-slim`                             | never                 |
| `/.github/workflows/` (9 files)     | 6 distinct actions, referenced by tag               | 2026-02-19            |

Also at the repo root: `pnpm-workspace.yaml` and `pnpm-lock.yaml`. There is no
`package-lock.json` and no `yarn.lock` - the March migration replaced them.

Root `package.json`:

```json
{
  "name": "orchard",
  "private": true,
  "packageManager": "pnpm@9.7.0",
  "devDependencies": { "eslint": "9.4.0", "typescript": "5.4.5", "...": "10 more" }
}
```

`pnpm-workspace.yaml` lists `packages/*`. The three workspace packages each
keep their own `package.json`.
