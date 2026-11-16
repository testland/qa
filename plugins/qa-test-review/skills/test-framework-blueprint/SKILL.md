---
name: test-framework-blueprint
description: "Use when designing a test automation framework from scratch or re-architecting one that grew organically. Walks seven steps from inventorying the app to runner, layout, fixtures, object model, data and mocks, reporting, CI and conventions, and outputs a written blueprint with a build order."
metadata:
  keywords: "test-framework, framework-design, blueprint, fixtures, sdet, playwright, test-architecture"
  version: "1.6.20"
---

# test-framework-blueprint

## Overview

This skill is a **build-an-X workflow**: it walks an SDET through designing a
test automation framework end to end and ends with two artifacts the team can
act on:

1. A **framework blueprint**: a short design doc recording the directory tree,
   fixture list, chosen object-model + data patterns, and CI matrix.
2. An **implementation order**: which piece to build first and what each later
   piece waits on.

It is the connective tissue between the pattern catalogs and the scaffolder.
The catalogs (`object-model-patterns`,
`test-isolation-patterns`,
`test-data-patterns` in qa-test-data)
say what each pattern IS; the scaffolder emits a skeleton once decisions
are made. Neither walks the decisions in order. This skill does.

## When to use

- Designing a test automation framework from scratch: the repo has no suite,
  or only scattered unit tests, and the team needs the full design before
  writing harness code.
- Re-architecting a framework that grew organically: helpers sprawled, nobody
  remembers why the fixtures look the way they do, and a
  framework-architecture audit run came back with structural findings.
- A new SDET joins a team with no written test architecture and needs to
  produce one.

Do **not** use this skill to:

- Pick only the runner. That single decision has a deeper reference: the
  `framework-choice-advisor` catalog (in the qa-process plugin) - NFR scoring
  + side-by-side trade-off matrices in prose. When a repo already has an E2E
  convention in `package.json`, prefer continuing with it unless there is a
  reason to switch. Step 2 below summarizes the criteria and hands off.
- Scaffold the skeleton. That is a separate harness-scaffolding step, which
  consumes this blueprint's decisions as its inputs.
- Audit an existing framework against its own conventions. That is a separate
  framework-architecture audit.

## Step 1 - Inventory the system under test

Before any tool is named, record four facts about the SUT. Every later
decision keys off them.

| Inventory item | Questions to answer |
|---|---|
| **App stack** | Languages, frameworks, persistence (e.g. Node + React + Postgres). Which external services does it call (payments, email, auth provider)? |
| **Deployment shape** | Monolith / services / serverless? Can a full stack run locally (compose file, dev server) or only in a shared environment? |
| **Change shape** | Where do PRs land - one monorepo, or per-service repos? Do most changes touch the API, the UI, or both? The layer that changes most needs the fastest feedback. |
| **Team skills** | What languages do the engineers writing and maintaining tests already know? Per `framework-choice-advisor` Step 1, the framework-language mismatch is the #1 maintenance cost. |

**Decision output:** a coverage-layers table stating which layers get
automated coverage in this framework and which are explicitly out of scope
(already covered elsewhere, or deferred). Example shape:

| Layer | In this framework? | Rationale |
|---|---|---|
| Unit | No | Lives in each package, owned by devs |
| API integration | Yes | Most PRs touch the API |
| Web E2E | Yes (thin) | Critical paths only |
| Contract | Deferred | Single team owns both sides today |

## Step 2 - Choose runner + language

Two criteria dominate; everything else is tie-breaking:

1. **Team language first.** A framework in a language the team does not write
   rots: nobody fixes flake they cannot read.
2. **One runner across layers when possible.** If the same runner can execute
   the API tier and the E2E tier (Playwright Test runs both: its built-in
   `request` fixture is an isolated `APIRequestContext` instance per test, per
   the [Playwright test-fixtures docs](https://playwright.dev/docs/test-fixtures)),
   the team maintains one config, one reporter, one CI job family.

For the full trade-off matrices (cross-browser, mobile, parallelization,
ecosystem, hire-ability) use `framework-choice-advisor`; when a repo already
has an E2E convention in `package.json`, prefer continuing with it unless
there is a reason to switch.

**Decision output:** one runner + one language, with the rejected
alternatives and the reason recorded in the blueprint (the rejection
rationale is what stops the debate from reopening every quarter).

## Step 3 - Directory layout + fixture architecture

### Layout (worked stack: Playwright + TypeScript)

```
tests/
  e2e/                    # browser tests, grouped by user journey
    invoicing/
    auth/
  api/                    # request-fixture tests, grouped by resource
  fixtures/
    db.ts                 # worker-scoped database fixtures
    auth.ts               # test-scoped authenticated-session fixtures
    index.ts              # merged export the specs import
  pages/                  # object model (Step 4)
  builders/               # test-data builders (Step 5)
playwright.config.ts
```

Rules of thumb: group specs by user-facing domain (not by page or by
developer); keep fixtures in their own modules per concern; specs import one
merged `test` object, never raw `@playwright/test`.

### Fixture scoping decisions

Playwright fixtures establish each test's environment and are set up on-demand
(only the ones a test needs), and Playwright offers exactly two scopes
([Playwright test-fixtures docs](https://playwright.dev/docs/test-fixtures)):

| Scope | Lifecycle | Blueprint use |
|---|---|---|
| **Test** (default) | Set up before and torn down after each test | Anything a test mutates: pages, sessions, seeded records |
| **Worker** | Set up once per worker process, reused across test files whose worker fixtures match | Expensive shared infrastructure tests only read, or per-worker isolated stores (database-per-worker) |

The blueprint records, per fixture: name, scope, what it provides, and
whether tests mutate it. The single rule from
`test-isolation-patterns` Pattern 2
applies verbatim: never share mutable fixtures across tests.

The Playwright fixture mechanics to standardize (`test.extend`, `auto`,
`mergeTests`, option fixtures) and the pytest mapping for Python teams live in
[references/fixture-mechanics.md](references/fixture-mechanics.md).

### Parallel workers: decide isolation before raising `-n` or `workers`

Failures that appear only when parallelism goes up, and vanish with one
worker, are shared-state bugs, not flake. The blueprint records how each
worker is isolated before the worker count goes above 1.

**pytest + pytest-xdist**

- Each xdist worker is a separate process that "will perform its own
  collection and execute a subset of all tests"
  ([xdist how-to](https://pytest-xdist.readthedocs.io/en/stable/how-to.html)),
  so a `scope="session"` fixture runs **once per worker**, not once per run.
  A session fixture that truncates tables or inserts seed rows in one shared
  database wipes rows other workers are using and hits duplicate keys on the
  seed rows.
- Give each worker its own database or schema, keyed on the `worker_id`
  fixture (`gw0`, `gw1`, ...; `"master"` when xdist is off) or the
  `PYTEST_XDIST_WORKER` environment variable; or run each test in a
  transaction rolled back at teardown.
- Work that must happen once across all workers (migrations, a template
  database) runs as a CI step before pytest, or behind a `FileLock` in
  `tmp_path_factory.getbasetemp().parent`, the directory all workers of one
  run share (the xdist how-to's own pattern; `filelock` is a separate
  package).
- No test builds on data an earlier test created: xdist spreads tests across
  processes, so `test_close_account` can run before or apart from
  `test_open_account`. Each test creates what it needs through fixtures or
  builders.
- Remove blanket `@pytest.mark.flaky(reruns=N)` marks added after parallelism
  was switched on. Reruns turn an isolation bug into a slower intermittent
  pass; fix the isolation, then mark only a test with a known, tracked cause.

Snippet (`_migrate` and the DSNs are placeholders):

```python
import psycopg
import pytest
from filelock import FileLock

ADMIN_DSN = "postgresql://test:test@localhost:5432/postgres"

@pytest.fixture(scope="session")
def worker_dsn(worker_id, tmp_path_factory):
    shared = tmp_path_factory.getbasetemp().parent  # same dir for every worker
    name = f"inventory_test_{worker_id}"
    with FileLock(str(shared / "db.lock")):  # one worker at a time
        if not (shared / "template.done").exists():
            _migrate("inventory_template")  # schema + reference rows, once per run
            (shared / "template.done").touch()
        with psycopg.connect(ADMIN_DSN, autocommit=True) as admin:
            admin.execute(f'DROP DATABASE IF EXISTS "{name}"')
            admin.execute(f'CREATE DATABASE "{name}" TEMPLATE inventory_template')
    return f"postgresql://test:test@localhost:5432/{name}"

@pytest.fixture
def db(worker_dsn):
    with psycopg.connect(worker_dsn) as conn:
        yield conn
        conn.rollback()  # nothing a test writes survives it
```

**Playwright Test**

- Log in once, not in every `beforeEach`: a setup project
  (`testMatch: /.*\.setup\.ts/`) listed in the test projects'
  `dependencies`, saving `storageState` under `playwright/.auth/`. The
  [Playwright auth docs](https://playwright.dev/docs/auth) recommend adding
  `playwright/.auth` to `.gitignore`; a committed state file is a live
  session credential.
- Tests that change server-side state (create records, then assert a count
  or a list) get **one account per parallel worker**: a worker-scoped fixture
  that logs in the account picked by `test.info().parallelIndex`, which the
  auth docs call "the recommended approach for tests that modify server-side
  state". Or assert only on the records the test itself created.
- No retry wrappers and no `page.waitForTimeout`: actions auto-wait for
  actionability and web-first assertions such as
  `await expect(locator).toHaveText('3 items')` wait "until the expected
  condition is met"
  ([best practices](https://playwright.dev/docs/best-practices)). A wrapper
  that repeats a click can submit twice and hides real failures.
- Test retries stay 0 (Step 6) with `trace: 'retain-on-failure'`. If a
  migration period needs CI retries, cap them at 1 with
  `trace: 'on-first-retry'`, so a test that passes only on retry is
  reported as flaky with a trace
  ([trace viewer](https://playwright.dev/docs/trace-viewer)); never
  `retries: 3` with `trace: 'off'`.

```ts
// fixtures/auth.ts - one account per worker (adapted from the auth docs)
import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    const file = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);
    if (!fs.existsSync(file)) {
      const page = await browser.newPage({ storageState: undefined });
      // log in as the account provisioned for worker `id`, then wait for a signed-in marker
      await page.context().storageState({ path: file });
      await page.close();
    }
    await use(file);
  }, { scope: 'worker' }],
});
```

**Decision output:** an isolation row per shared resource (database,
accounts, queues, files): per-worker copy, per-test rollback, or read-only,
plus where once-only setup runs.

## Step 4 - Object-model decision

Pick exactly **one** object-model pattern; mixing two in one codebase is the
top cross-cutting anti-pattern in
`object-model-patterns`. The short
decision rule (full when-to-use rules, canonical citations, and per-pattern
anti-patterns live in that catalog - defer to it, do not restate it):

| Choose | When |
|---|---|
| **Page Object Model** | Page-oriented SUT, 3+ engineers, classic runner; the default |
| **+ Component Objects** | Component-architected frontend (React/Vue) with shared nav/modals; refinement of POM, not a competitor |
| **Screenplay** | Suite will exceed ~200 tests or has multiple actor types sharing interactions |
| **App Actions** | Cypress idiom; SUT exposes a programmatic state API and setup dominates runtime |

**Decision output:** the pattern name + the catalog link, plus the deferral
rule: do not build the object-model layer until roughly 10 tests exist (see
Anti-patterns); the blueprint names the pattern, the implementation order
delays it.

## Step 5 - Test data + mocking wiring

Three sub-decisions, each deferring to its own deeper tool:

1. **Seed strategy.** What state exists before any test runs? Decide between
   empty-database + per-test creation, a curated seed set (author it with
   `seed-data-curator` in qa-test-data),
   or template-database cloning. The isolation mechanics
   (transaction-rollback vs database-per-worker vs template clone) come from
   `test-isolation-patterns` Pattern 4.
2. **Construction pattern.** Builder vs Factory vs Object Mother:
   `test-data-patterns` (qa-test-data)
   is the catalog. Default for a new framework: Test Data Builder for the 2-3
   core domain objects, nothing else until duplication appears.
3. **Mock-server placement.** Which external dependencies get stubbed, and
   where the stub runs (in-process interception vs a standalone stub the
   whole stack points at). The per-stack tool choice (WireMock / MSW /
   Mountebank, by detected runtime) is a separate concern; the blueprint
   records only the boundary: which services are real, which are stubbed,
   and in which layer.

**Decision output:** a one-line entry per external dependency (real / stubbed
/ contract-tested) and the seed + builder choices.

## Step 6 - Reporting + CI integration

- **Machine-readable output first.** Configure JUnit XML alongside the
  human-facing reporter: per the
  [Playwright test-reporters docs](https://playwright.dev/docs/test-reporters),
  `reporter: [['junit', { outputFile: 'results.xml' }]]` produces a
  JUnit-style XML report CI systems ingest.
- **Sharding.** Do not design for shards on day one. Adopt the
  suite-runtime thresholds from
  `ci-test-job-conventions` (in the qa-ci-integration plugin)
  §1 (no sharding under 2 minutes; 2-4 shards for a 10-30 minute suite) and
  record the trigger runtime in the blueprint. When sharding lands, the
  mechanics for the worked stack are `npx playwright test --shard=1/4` plus
  the blob reporter and `npx playwright merge-reports --reporter html`,
  per the [Playwright sharding docs](https://playwright.dev/docs/test-sharding).
- **Retries: 0 at test level.** A test that passes only on retry is "flaky"
  ([Playwright retries](https://playwright.dev/docs/test-retries)); a nonzero
  `retries` turns it green. A runner lost before tests start gets a job
  re-run (`gh run rerun <run-id> --failed`), never a test retry
  (`ci-test-job-conventions` §2).
- **Triggers differ.** Per-PR: API plus a one-browser smoke subset; merge to
  main: full suite; cross-browser matrix: merge or nightly `schedule`, never
  every PR (`ci-test-job-conventions` §5).

**Decision output:** the CI matrix table (trigger × suite × shards × retry);
before recording it, check every row has test retry 0 and distinct content.

## Step 7 - Conventions doc + review gates

The blueprint ends as a living `docs/test-conventions.md` in the repo. It
contains, at minimum: the coverage-layers table (Step 1), the runner decision
with rejected alternatives (Step 2), the fixture table and scoping rules
(Step 3), the object-model pattern name + catalog link (Step 4), the
real/stubbed dependency list (Step 5), and the CI matrix (Step 6).

A conventions doc nobody enforces drifts. Wire the enforcement loop from this
plugin:

- A per-PR check on test file paths flags per-file violations (structure,
  naming, magic numbers, slow setup).
- A quarterly (or pre-release) framework-architecture audit checks the
  cross-file tier, including documented-vs-actual convention drift: it reads
  this very conventions doc and flags where the codebase diverged from it.

## Worked example

A full worked example - "Ledgerly", a B2B invoicing web app - walking all seven
steps and ending with the implementation order lives in
[references/worked-example.md](references/worked-example.md).

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Copying the framework from a previous job regardless of change shape | The old framework encoded the old SUT's inventory (Step 1); a UI-heavy framework on an API-heavy product tests the wrong layer slowly |
| Building abstraction layers before ~10 tests exist | Abstractions extracted from zero usage guess wrong; extract from observed duplication (the rule-of-three framing in `test-code-conventions` §11) |
| One mega base-class every test inherits | Depth-3+ hierarchies break unpredictably on root changes (§A2); compose fixtures instead |
| Choosing the runner before the team-skills inventory | Framework-language mismatch is the #1 maintenance cost per `framework-choice-advisor` |
| Designing the CI matrix for scale on day one (8 shards, 3 retries) | Retries hide flake in a young suite; shards add cost below the `ci-test-job-conventions` §1 runtime thresholds |
| Raising `-n` or `workers` on a suite with one shared database and a session-scoped truncate or seed | xdist runs session fixtures once per worker, so workers wipe each other's rows; isolate per worker first |
| Rerun marks, retry wrappers or `retries: 3` added when parallel runs start failing | They hide the shared-state bug and slow the suite; a pass on retry is flake to fix, with a trace to fix it from |
| Skipping the written blueprint ("the code is the doc") | Documented-vs-actual drift becomes undetectable; the drift check needs a documented side to compare against |

## Limitations

- This skill **designs** the framework; it writes no code. The
  `automation-harness-bootstrapper` agent (qa-web-e2e) scaffolds the skeleton
  from the blueprint, and the per-framework skills in qa-web-e2e
  (`playwright-testing`, `cypress-testing`, etc.) implement the actual tests.
- The worked stack is Playwright + TypeScript; the pytest mapping in Step 3
  is noted with citations but not carried through the worked example.
- Layer-mix sizing (how many tests per tier) is out of scope: that is
  `test-pyramid-balancer` in qa-process.

## References

- Playwright - *Fixtures* (fixture scopes, `test.extend`, `auto`, `option`,
  `mergeTests`; the load-bearing Step 3 source):
  https://playwright.dev/docs/test-fixtures
- Playwright - *Reporters* (junit / html / blob configuration):
  https://playwright.dev/docs/test-reporters
- Playwright - *Sharding* (`--shard=x/y`, blob + `merge-reports`):
  https://playwright.dev/docs/test-sharding
- Playwright - *Retries* (passed / flaky / failed, `retries`, `--retries`,
  no retries by default):
  https://playwright.dev/docs/test-retries
- GitHub Actions - *Re-running workflows and jobs* (`gh run rerun --failed`):
  https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs
- GitHub Actions - *Events that trigger workflows* (`pull_request`, `push`
  branch filters, `schedule`):
  https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- pytest-xdist - *How-tos* (session fixtures run per worker, `FileLock` in
  `tmp_path_factory.getbasetemp().parent`, `worker_id`,
  `PYTEST_XDIST_WORKER`):
  https://pytest-xdist.readthedocs.io/en/stable/how-to.html
- Playwright - *Authentication* (setup project, git-ignored
  `playwright/.auth`, one account per parallel worker via `parallelIndex`):
  https://playwright.dev/docs/auth
- Playwright - *Best practices* (web-first assertions, auto-waiting, traces
  on CI): https://playwright.dev/docs/best-practices
- Playwright - *Trace viewer* (`on-first-retry`, `retain-on-failure`):
  https://playwright.dev/docs/trace-viewer
- pytest - *How to use fixtures* (five scopes, `conftest.py`, `yield`
  teardown, `autouse`):
  https://docs.pytest.org/en/stable/how-to/fixtures.html
- `object-model-patterns`,
  `test-isolation-patterns`,
  `test-data-patterns` (qa-test-data) -
  the sister pattern catalogs Steps 3-5 defer to.
- `framework-choice-advisor` (qa-process) - the Step 2 deep tool.
- `ci-test-job-conventions` (qa-ci-integration) -
  the Step 6 conventions reference.
