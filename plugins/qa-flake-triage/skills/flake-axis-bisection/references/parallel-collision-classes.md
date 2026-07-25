# Parallel-execution collision classes

Deep reference for `flake-axis-bisection` SKILL.md. Consult once the
worker-count axis (Step 6) has been implicated, to identify which shared
resource two workers are stepping on.

If the worker-count axis moved the rate, the next question is narrower:
which resource are two workers stepping on? Fowler's isolation rule is the
target state: "Keep your tests isolated from each other, so that execution
of one test will not affect any others"
([Fowler](https://martinfowler.com/articles/nonDeterminism.html)).

Walk the classes in order. Each row names the discriminating observation
and the fix that makes the resource per-worker.

| Class | Signal | Discriminating probe | Typical fix |
|---|---|---|---|
| DB row | Two workers insert the same key. Duplicate-key errors. | Log every statement with the originating test name, then look for the same key from two workers in one overlapping window. | Namespace inserted IDs per worker, or generate UUIDs, instead of fixture-hardcoded integers. |
| DB schema | Workers run migrations against one shared schema mid-suite. | Snapshot the table list before and after; a table appearing mid-run is a migration racing a query. | Give each worker its own schema. PostgreSQL resolves unqualified names through `search_path`, so `SET search_path TO myschema;` makes a per-worker schema current ([PostgreSQL, Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)). |
| File path | Two workers write the same path. | Record `(test name, path)` pairs for writes; group by path and look for two test names. | Per-worker temp directory. |
| Port | Two workers bind the same port. `EADDRINUSE` at worker startup. | Snapshot listening sockets at each test boundary. | Derive the port from the worker index. Playwright exposes the index as `process.env.TEST_WORKER_INDEX` and `process.env.TEST_PARALLEL_INDEX`, or `testInfo.workerIndex` and `testInfo.parallelIndex` ([Playwright, Parallelism](https://playwright.dev/docs/test-parallel)). |
| Env var | One worker sets a process env value, another reads a stale one. | Diff the environment before and after the suite; anything that changed is shared mutable state. | Pass the value explicitly rather than through process-global state. |
| Module state | A cached singleton (connection pool, client) is shared across tests. | Assert object identity across two tests; if it is the same instance, the module registry is being reused. | Reset the module registry between tests. `jest.resetModules()` "resets the module registry", which the docs describe as useful "to isolate modules where local state might conflict between tests" ([Jest object API](https://jestjs.io/docs/jest-object)). Otherwise construct one instance per worker. |
| Filesystem inode | Two workers rename or unlink the same path. | Same write log as the file-path row, filtered to rename and unlink. | Per-worker directory. Confirm on the same OS image as CI: the observable failure differs by platform, which entangles this with the environment axis. |
| Cookie or storage jar | Browser state leaks between tests. | Assert that storage is empty at test start. | One fresh browser context per test. Playwright "uses browser contexts to achieve Test Isolation", so that "each test has its own local storage, session storage, cookies etc." ([Playwright, Isolation](https://playwright.dev/docs/browser-contexts)). |

Two collision sources this walk cannot reach: kernel-level socket state
(sockets held in `TIME_WAIT`), which needs per-worker network namespaces,
and external-service state such as a third-party rate limit applied across
all workers, which needs per-worker credentials. If every row above comes
back clean and the worker-count axis still reproduces, those two are what is
left.
