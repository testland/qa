# Compose flag reference for tests

Source docs: [compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/),
[compose up](https://docs.docker.com/reference/cli/docker/compose/up/),
[compose services schema](https://docs.docker.com/reference/compose-file/services/).

## `depends_on` conditions

| Condition                        | Meaning                                                                      |
|----------------------------------|------------------------------------------------------------------------------|
| `service_started`                | Container has been created and started (default - usually wrong for tests).  |
| `service_healthy`                | Dependency's `healthcheck` succeeded - the right choice for DBs / queues / app. |
| `service_completed_successfully` | Dependency ran to completion and exited 0 - for one-shot init / migration containers. |

## `up` flags (gate on readiness)

| Flag                           | Effect                                                              |
|--------------------------------|--------------------------------------------------------------------|
| `--wait`                       | "Wait for services to be running\|healthy. Implies detached mode." |
| `--wait-timeout <seconds>`     | "Maximum duration in seconds to wait for the project to be running\|healthy" |
| `--abort-on-container-exit`    | "Stops all containers if any container was stopped." (Foreground.) |
| `--abort-on-container-failure` | "Stops all containers if any container exited with failure."       |
| `--exit-code-from <service>`   | "Return the exit code of the selected service container. Implies `--abort-on-container-exit`." |

## `down` flags (teardown)

| Flag               | Effect                                                                    |
|--------------------|---------------------------------------------------------------------------|
| `--volumes` / `-v` | Remove named volumes declared in the compose file. Without this, DB state persists across runs and the next run sees stale data. |
| `--remove-orphans` | Remove containers for services not defined in the current file. Defends against renamed services leaving stragglers. |
