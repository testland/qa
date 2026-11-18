# Fix the database service and required check in our test workflow

## Problem Description

Fix `.github/workflows/test.yml` for the problems in `docs/ci-problems.md`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .github/workflows/test.yml ===============
name: tests
on:
  pull_request:
    paths-ignore: ['docs/**', '**.md']
jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
    env:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: sleep 15 && npm run migrate && npm test

=============== FILE: docs/ci-problems.md ===============
1. Integration tests fail with `getaddrinfo ENOTFOUND postgres`.
2. `integration` is a required check now. Docs-only PRs show "Expected - Waiting for status to be
   reported" forever and cannot be merged.
3. `sleep 15` was added because migrations failed with "the database system is starting up";
   it still fails sometimes.
4. When a test fails we only see "exit code 1"; reviewers want the failing test names.
