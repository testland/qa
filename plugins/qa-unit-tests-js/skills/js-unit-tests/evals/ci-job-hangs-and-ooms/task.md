# Unit-test job hangs, then dies

## Problem Description

Our unit-test job on GitHub Actions has two failure modes and we have been
cancelling it by hand.

On the `web` package the job never finishes. It prints the test results and
then sits there until the 60-minute timeout kills it.

On the `api` package the job dies partway through with an out-of-memory error.
It passes on a developer laptop with 16 cores; the runner has two.

We also cannot see which test failed without opening the raw log, and we would
like the results in a form our reporting tooling can read.

`web` is a Vite project. `api` is a plain Node service on Jest. Both are in one
repository and both are run by the same workflow.

## Output Specification

Deliver a corrected `.github/workflows/unit-tests.yml` that:

1. Terminates on its own for both packages.
2. Survives a two-core runner.
3. Emits a machine-readable result file per package, uploaded so the reporting
   tooling can pick it up.

Also correct the `test` scripts in `web/package.json` and `api/package.json` if
they contribute to either failure.

Do not change any test file.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/unit-tests.yml ===============
name: unit-tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      matrix:
        package: [web, api]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
        working-directory: ${{ matrix.package }}
      - run: npm test
        working-directory: ${{ matrix.package }}

=============== FILE: web/package.json ===============
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}

=============== FILE: web/vite.config.ts ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});

=============== FILE: api/package.json ===============
{
  "name": "api",
  "private": true,
  "scripts": {
    "test": "jest --watchAll"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: api/jest.config.js ===============
module.exports = {
  testEnvironment: 'node',
};
