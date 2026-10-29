---
name: stryker-mutation
description: "Use when a JavaScript or TypeScript suite has high coverage but bugs still slip through, and the team wants mutation testing to find weak tests. Sets up StrykerJS: the Jest, Vitest, Mocha or Karma runner, stryker.conf.json, thresholds and incremental runs on pull requests."
---

# stryker-mutation

## Overview

Mutation testing plants small bugs (mutants) in production code and
re-runs the tests. A mutant that survives means no test noticed the
change: the line is covered but not checked. StrykerJS does this for
JavaScript and TypeScript, including React, Angular, Vue, Svelte and
Node projects ([introduction][si]).

## When to use

- A JS/TS suite has ≥80% line or branch coverage and the team wants to
  know whether its assertions catch bugs.
- Reviews keep finding weak assertions (`toBeTruthy()` on objects); the
  mutation score makes the cost visible.
- A critical module needs a stronger bar than coverage.

## Step 1 - Install the core and one runner

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
# or: mocha-runner, vitest-runner, karma-runner, jasmine-runner, cucumber-runner, tap-runner
```

## Step 2 - Write the config

`npx stryker init` asks a few questions and writes the config. The
result should look like this:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"],
  "reporters": ["progress", "clear-text", "html"],
  "thresholds": { "high": 80, "low": 60, "break": 50 }
}
```

| Field | Meaning ([configuration][cfg]) |
|---|---|
| `mutate` | Globs of files to mutate. Exclude test files and type declarations. Exclude generated files one by one, on evidence (generator banner, codegen manifest), not by directory name. |
| `coverageAnalysis` | `perTest` (the default since v5) runs only the tests that cover each mutant. |
| `thresholds` | `high` / `low` colour the report; `break` makes `stryker run` exit with code 1 when the score is below it. `break` defaults to `null` (never fail). All three values must be given together. |
| `concurrency` | Worker processes; defaults to n-1 logical cores (n when there are 4 or fewer). |
| `checkers` | `["typescript"]` type-checks each mutant first, so type-invalid mutants are not run. |

## Step 3 - Check the setup before the full run

A full run can take 5-30 minutes, so validate cheaply first:

1. `npx stryker run --dryRunOnly` runs only the initial test run
   ([configuration][cfg]). It must pass; a failing dry run means the
   runner or config is wrong, not the tests.
2. Run on one small file: `npx stryker run --mutate src/cart.ts`. Check
   the mutant count is plausible and the HTML report opens
   (`reports/mutation.html` by default).
3. Only then run `npx stryker run` on the full `mutate` set.

## Step 4 - Read the result

```
[Survived] EqualityOperator
src/cart.ts:42:5
-   if (item.qty < 0) throw new Error("bad qty");
+   if (item.qty <= 0) throw new Error("bad qty");
```

A survived mutant is a missing test: here nothing checks `qty = 0`.
Add that test, re-run the file with `--mutate src/cart.ts`, and confirm
the mutant is now `Killed`.

The summary gives killed, survived, timed-out and no-coverage counts
and the mutation score. Some survivors are equivalent mutants
(behaviour unchanged); record them and move on.

## Judgement rules when the score looks wrong

- **No-coverage mutants in a module that has tests:** check the runner's
  test-file globs and the dry-run test count before writing tests or
  excluding the file. A suite the runner never loads looks exactly like
  missing tests.
- **Generated code:** exclude the files a generator actually writes
  (banner or codegen manifest). Hand-written code that lives next to
  them stays in `mutate`, and generated code gets no test suite of its
  own.
- **A sudden score jump with no new tests:** look for test files or
  whole modules newly dropped from `mutate`; restate the score on the
  agreed scope.
- **A failing gate:** fix what is measured or the tests, never lower
  `break` to make it pass. Check the CI step does not swallow the exit
  code (`|| true`, `continue-on-error`).
- **Slow PR runs:** use a native runner (not the `command` runner, which
  cannot do `perTest` analysis) and incremental mode before narrowing
  the scope.

## Step 5 - Set the break threshold with the team

Set `break` a few points below today's score, agree it in a PR, and
raise it as the score improves. A `break` far above the current score
fails every build and gets switched off.

## Step 6 - Incremental mode for PRs

`npx stryker run --incremental` (or `"incremental": true`) stores
results in `reports/stryker-incremental.json` and on the next run
re-tests only mutants whose code or covering tests changed
([incremental][inc]). Keep that file between CI runs (cache it, or
download the last main-branch report). Stryker only tracks mutated and
test files, so changes to dependencies, environment variables or
snapshot files are not detected; run a full `--force` run on a
schedule to catch them.

```yaml
on:
  pull_request:
  schedule:
    - cron: "0 2 * * 0"        # weekly full run

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - uses: actions/cache@v4
        with:
          path: reports/stryker-incremental.json
          key: stryker-incremental-${{ github.run_id }}
          restore-keys: stryker-incremental-
      - name: Incremental run (PR)
        if: github.event_name == 'pull_request'
        run: npx stryker run --incremental
      - name: Full run (weekly)
        if: github.event_name == 'schedule'
        run: npx stryker run --incremental --force
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: stryker-report
          path: reports/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `break: 100` | Unreachable; the job gets disabled | Start below today's score and ratchet (Step 5) |
| Full runs on every PR | 30-minute feedback | `--incremental` on PRs (Step 6) |
| Skipping the dry run | A broken runner config wastes a full run | Step 3 checks first |
| Mutating test or generated files | Scores code nobody maintains | Exclude in `mutate` |
| `coverageAnalysis: "off"` | Runs every test for every mutant | Keep `perTest` |

## Limitations

- Slow on large codebases even with `perTest` and incremental mode.
- Equivalent mutants survive by design; they need human triage
  (`mutant-survival-triage`).
- Incremental mode misses changes outside mutated and test files.
- Runner support differs: Jest, Vitest and Cucumber report test
  locations, so incremental reuse is most precise there ([incremental][inc]).

## References

- [StrykerJS introduction][si] - supported projects and runners.
- [StrykerJS configuration][cfg] - `mutate`, `thresholds`, `coverageAnalysis`, `concurrency`, `checkers`, `dryRunOnly`, `htmlReporter`.
- [StrykerJS incremental mode][inc] - `--incremental`, `incrementalFile`, `--force`, what is not tracked.
- Sibling skills: `mutant-survival-triage` (triage survivors), `stryker-net-mutation` (.NET), `pitest-mutation` (Java), `mutmut-mutation` (Python), `mull-mutation` (C/C++).

[si]: https://stryker-mutator.io/docs/stryker-js/introduction/
[cfg]: https://stryker-mutator.io/docs/stryker-js/configuration/
[inc]: https://stryker-mutator.io/docs/stryker-js/incremental/
