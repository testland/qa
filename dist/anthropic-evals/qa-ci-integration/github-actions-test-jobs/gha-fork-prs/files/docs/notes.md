We're an open-source library and most PRs come from forks. With `pull_request`, fork PRs failed
because PAYMENTS_SANDBOX_KEY was empty, so we switched to `pull_request_target`. Only the
`test/integration/payments` folder needs the key; the other 900 tests need no secrets.
