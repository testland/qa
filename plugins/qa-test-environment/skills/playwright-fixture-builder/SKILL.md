---
name: playwright-fixture-builder
description: "Builds reusable Playwright fixtures via `test.extend` - picks the right scope (test vs worker), wires the `use(value)` setup/teardown split, composes auth (storageState per worker), database (per-test snapshot/restore), and feature-flag fixtures into one custom `test` object the whole suite imports. Outputs the `fixtures.ts` file plus per-fixture review notes (scope rationale, teardown ordering, `workerInfo.workerIndex` for parallel isolation). Use when the suite has copy-pasted `beforeEach` boilerplate that should be a fixture, or when adding auth / db / flag setup that crosses many specs."
---

# playwright-fixture-builder

## Overview

Playwright Test fixtures "establish the environment for each test,
giving the test everything it needs and nothing else"
([pw-fixtures][pw-fix]). They replace `beforeEach` / `afterEach`
boilerplate with composable, lazy-initialized values that hang off
the `test` function:

[pw-fix]: https://playwright.dev/docs/test-fixtures

```typescript
test('does X', async ({ page, todoPage, authedUser }) => {
  // page, todoPage, authedUser are fixtures
});
```

This skill is **build-an-X** - it produces the `fixtures.ts` (or
language-equivalent) file from the team's actual setup needs (auth,
database state, feature flags, app instance), picking the right
scope and teardown ordering for each.

The default Playwright fixtures available out of the box are
**`page`, `context`, `browser`, `browserName`, and `request`**
([pw-fixtures][pw-fix]).

## When to use

- Multiple spec files copy-paste `beforeEach`/`afterEach` setup
  blocks that should be a fixture.
- A new test suite needs auth + DB + flags wired and the team wants
  one cohesive `fixtures.ts` rather than ad-hoc helpers.
- An existing suite is slow because each test re-authenticates;
  there's a worker-scope shortcut available.
- The team is adding parallelism and current fixtures don't honor
  `workerInfo.workerIndex` for per-worker isolation.

If the suite has only a handful of specs and one common helper, a
shared `helpers.ts` file is enough - fixtures pay off when 5+ specs
share setup or when teardown ordering matters.

## How to use

1. List every `beforeEach`/`afterEach` block the specs share (auth,
   DB reset, flag setup, page objects).
2. Assign each a scope with Step 1's rule of thumb - `worker` for
   immutable expensive state, `test` for anything that changes
   between tests.
3. Write each fixture with the `use(value)` setup/teardown split -
   recipes for auth, page object, DB, and flags are in
   [references/fixture-recipes.md](references/fixture-recipes.md).
4. Compose them in dependency order (auth → db → flags) into one
   `test` export; see
   [references/composition-and-output.md](references/composition-and-output.md).
5. Confirm teardown runs in reverse of setup, and box internal
   helper fixtures out of the report.
6. Replace the specs' copy-pasted blocks with a single import from
   the composed `fixtures/index.ts`.
7. Emit the per-fixture review note (scope, auto, boxed, setup cost,
   teardown) so a reviewer can sanity-check the scoping.

## Step 1 - Identify the right scope per fixture

Per [pw-fixtures][pw-fix]:

> "**Test-scoped** (default): Run before/after each test, torn down
> immediately after."
>
> "**Worker-scoped**: Run once per worker process, sharing resources
> across multiple tests. Declare with `{ scope: 'worker' }`."

| Fixture                   | Scope      | Why                                                                              |
|---------------------------|------------|----------------------------------------------------------------------------------|
| Authenticated user        | `worker`   | Auth handshake is expensive (UI login, cookie set, OTP); state is shareable.    |
| Storage-state file path   | `worker`   | One storageState per worker keeps server-side cohorts isolated.                 |
| Page object (TodoPage)    | `test`     | Each test needs a clean DOM and navigation start.                                |
| Test-DB snapshot          | `test`     | Per-test isolation requires per-test restore.                                    |
| Feature-flag overrides    | `test`     | Different tests may want different flag combos (compose with feature-flag-test-harness). |
| Browser instance          | `worker`   | (Playwright default) - sharing cuts ~500ms per test.                             |
| Test-data factory         | `test`     | Each test gets fresh fixtures with worker-namespaced IDs.                       |

**Rule of thumb:** if changing the fixture between two tests would
cause a test to fail, scope it `test`. Otherwise scope it `worker`.

## Fixture recipes, composition, output

- Per-fixture code recipes - auth (`storageState` per worker), page
  object, DB snapshot/restore, feature-flag overrides:
  [references/fixture-recipes.md](references/fixture-recipes.md).
- Composing the layers into one `test` export, teardown ordering,
  boxing internal fixtures, and the review-note output format:
  [references/composition-and-output.md](references/composition-and-output.md).

## Worked example

A suite of 12 checkout specs each opens with the same `beforeEach`:
log in through the UI, reset the test DB, then set a feature flag.
That block re-authenticates once per test, so the run spends ~12s
just logging in.

Refactor it into four fixtures. `storageState` moves to **worker**
scope keyed by `user${workerInfo.workerIndex}`, so each worker logs
in once (~1.2s) instead of every test. `cleanDb` is **test**-scoped
with `{ auto: true }` so every spec starts from a restored snapshot
without listing it. `flags` is **test**-scoped and restores an empty
provider on teardown so a leaked override can't poison the next
test. `todoPage` stays **test**-scoped because the page object holds
per-test state.

They compose auth → db → flags in `fixtures/index.ts`; each spec now
imports `{ test, expect }` from there and drops its `beforeEach`. A
checkout test becomes
`async ({ page, flags, cleanDb }) => { await flags({ promo_codes: true }); ... }`.
The per-fixture review note records that worker-scoped auth cut
~600ms × 12 tests and that `flags` teardown is what keeps
combinations isolated.

## Anti-patterns and limitations

The full anti-pattern table (wrong-scope fixtures, `beforeAll` in a
parallel suite, manual `context.close()`, committing auth files, one
mega-fixture) and the limitations (no mid-test scope changes, session
storage not auto-captured, teardown failures don't fail the test,
per-fixture timeout) are in
[references/anti-patterns-and-limits.md](references/anti-patterns-and-limits.md).

## References

- [pw-fix][pw-fix] - `test.extend`, scope (test vs worker),
  `workerInfo.workerIndex`, automatic / boxed fixtures, default
  fixtures.
- [pw-auth][pw-auth] - `storageState` pattern, per-worker
  authentication via `parallelIndex`, role-based auth files,
  security note on `.gitignore`.
- `feature-flag-test-harness` - the matrix-shard pattern that complements per-test `flags`
  fixture overrides.
- `testcontainers`,
  `docker-compose-tests` - the
  underlying stack the fixtures point at.

[pw-auth]: https://playwright.dev/docs/auth
