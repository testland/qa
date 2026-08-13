---
name: test-framework-blueprint
description: "Build-an-X workflow that takes an SDET from no test suite to a complete framework design in seven steps - inventory the SUT, choose runner + language, directory layout + fixture architecture, object-model decision, test data + mocking wiring, reporting + CI integration, conventions doc + review gates - producing a written framework blueprint (directory tree, fixture list, chosen patterns, CI matrix) plus an implementation order. This is the whole-framework design workflow - not the Step 2 runner-choice decision on its own, not the Step 4 object-model pattern catalog it defers to, and not the scaffolder that generates the harness skeleton once the blueprint exists. Use when designing a test automation framework from scratch or re-architecting one that grew organically."
metadata:
  keywords: "test-framework, framework-design, blueprint, fixtures, sdet, playwright, test-architecture"
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
- **Retry policy and per-trigger filtering** (what runs per-PR vs per-merge
  vs nightly) follow the cross-platform conventions in
  `ci-test-job-conventions`;
  the blueprint records the chosen matrix, not the rationale prose.

**Decision output:** the CI matrix table (trigger × suite × shards × retry).

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
