# acme/platform - manifests after the 2026-08-24 merge

| Manifest                          | Came from      | Notes                                   |
|-----------------------------------|----------------|-----------------------------------------|
| `/package.json`                    | acme/web       | 41 prod deps, 96 dev deps               |
| `/apps/admin/package.json`         | acme/admin     | 18 prod deps, 61 dev deps               |
| `/services/api/Dockerfile`         | acme/api       | `FROM node:20-alpine`                   |
| `/services/dispatch/go.mod`        | acme/dispatch  | 34 direct requires, changes most weeks  |
| `/infra/main.tf`                   | acme/infra     | 6 providers                             |
| `/.github/workflows/*.yml`         | all four       | 11 workflow files                       |

Each of the four source repos kept its manifest at its own repo root before the
merge. Nothing else moved after 2026-08-24.
