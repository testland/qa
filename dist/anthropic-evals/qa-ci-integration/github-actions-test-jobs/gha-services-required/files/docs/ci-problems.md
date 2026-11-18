1. Integration tests fail with `getaddrinfo ENOTFOUND postgres`.
2. `integration` is a required check now. Docs-only PRs show "Expected - Waiting for status to be
   reported" forever and cannot be merged.
3. `sleep 15` was added because migrations failed with "the database system is starting up";
   it still fails sometimes.
4. When a test fails we only see "exit code 1"; reviewers want the failing test names.
