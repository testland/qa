# docker-compose-tests anti-patterns

Catalog of the failure modes summarized in the skill's Anti-patterns
section, with the reason each fails and the fix.

| Anti-pattern                                                           | Why it fails                                                                  | Fix |
|------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| `depends_on: db` without `condition: service_healthy`                  | Default `service_started` means "container exists" - Postgres isn't ready; app crashes on first connection. | Add a `healthcheck` to the dependency and gate with `condition: service_healthy`. |
| Sharing one project name across parallel CI jobs                       | Two jobs pick the same container/network names; one accidentally tears down the other's state. | `COMPOSE_PROJECT_NAME=<unique-per-job>`. |
| `down` without `--volumes`                                             | DB state carries over to the next run; tests pass on dirty state, fail on clean state. | Always `down --volumes --remove-orphans` in `if: always()`. |
| `up` foreground in CI without `--abort-on-container-exit`              | The test container exits but Compose keeps the others running; the job hangs until timeout. | `--abort-on-container-exit --exit-code-from <test-svc>`, or `up --wait` then explicit `run --rm`. |
| Running migrations from inside `app`'s entrypoint                      | App and migrations race on cold start; intermittent connection-refused.        | Separate `migrate` service with `service_completed_successfully` gate (Step 3). |
| Mounting host source into the test app via `volumes:` in CI            | CI source tree and image both write to the same path; build artifacts pollute the workspace. | Use bind mounts only for local-dev compose; tests run against the built image. |
| Reusing the local-dev compose.yaml for tests                           | Test topology grows hidden coupling to the dev convenience services.          | Separate `compose.test.yaml`; `-f compose.test.yaml` everywhere. |
| Hard-coded host ports (`ports: ["5432:5432"]`) in the test compose      | Two parallel jobs collide on the host port.                                    | Don't expose ports on the host in CI; rely on the Compose network for in-stack reachability. |

Sources: [compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/),
[compose services schema](https://docs.docker.com/reference/compose-file/services/).
