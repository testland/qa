# Make our tests run safely on fork pull requests

## Problem Description

Review our test workflow (`.github/workflows/test.yml`, background in `docs/notes.md`) and make tests on fork pull requests work safely.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .github/workflows/test.yml ===============
name: test
on:
  pull_request_target:
    types: [opened, synchronize]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm ci
      - run: npm test
        env:
          PAYMENTS_SANDBOX_KEY: ${{ secrets.PAYMENTS_SANDBOX_KEY }}

=============== FILE: docs/notes.md ===============
We're an open-source library and most PRs come from forks. With `pull_request`, fork PRs failed
because PAYMENTS_SANDBOX_KEY was empty, so we switched to `pull_request_target`. Only the
`test/integration/payments` folder needs the key; the other 900 tests need no secrets.
