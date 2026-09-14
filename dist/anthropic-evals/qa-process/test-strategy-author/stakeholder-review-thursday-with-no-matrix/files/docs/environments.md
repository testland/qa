# Kettle environments

| Environment | What it is                                               |
|-------------|----------------------------------------------------------|
| Local        | docker compose: api, worker, column store, postgres      |
| Staging      | Shared, one instance, seeded with three synthetic tenants |
| Production   | Single region (eu-west-1), 11 enterprise tenants          |

No canary. No blue/green. Deploys go straight to production on a merge to main
after the CI job passes.
