---
name: test-framework-blueprint
description: "Build-an-X workflow that takes an SDET from no test suite to a complete framework design in seven steps - inventory the SUT, choose runner + language, directory layout + fixture architecture, object-model decision, test data + mocking wiring, reporting + CI integration, conventions doc + review gates - producing a written framework blueprint (directory tree, fixture list, chosen patterns, CI matrix) plus an implementation order. Distinct from `framework-choice-advisor` (qa-process; the deeper reference for the Step 2 runner decision alone), from `object-model-patterns` (the Step 4 pattern catalog this workflow defers to), and from `automation-harness-bootstrapper` (qa-roles; scaffolds the harness skeleton AFTER this blueprint exists). Use when designing a test automation framework from scratch or re-architecting one that grew organically."
keywords:
  - test-framework
  - framework-design
  - blueprint
  - fixtures
  - sdet
  - playwright
  - test-architecture
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
The catalogs ([`object-model-patterns`](../object-model-patterns/SKILL.md),
[`test-isolation-patterns`](../test-isolation-patterns/SKILL.md),
[`test-step-design-patterns`](../test-step-design-patterns/SKILL.md),
[`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md))
say what each pattern IS; the scaffolder
([`automation-harness-bootstrapper`](../../../qa-roles/agents/automation-harness-bootstrapper.md))
emits a skeleton once decisions are made. Neither walks the decisions in order.
This skill does.

## When to use

- Designing a test automation framework from scratch: the repo has no suite,
  or only scattered unit tests, and the team needs the full design before
  writing harness code.
- Re-architecting a framework that grew organically: helpers sprawled, nobody
  remembers why the fixtures look the way they do, and a
  [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md)
  run came back with structural findings.
- A new SDET joins a team with no written test architecture and needs to
  produce one.

Do **not** use this skill to:

- Pick only the runner. That single decision has two deeper tools: the
  [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md)
  reference catalog (NFR scoring + side-by-side trade-off matrices in prose)
  and the
  [`web-e2e-framework-selector`](../../../qa-web-e2e/agents/web-e2e-framework-selector.md)
  agent (reads the actual project files and returns one defended
  recommendation). Step 2 below summarizes the criteria and hands off.
- Scaffold the skeleton. That is
  [`automation-harness-bootstrapper`](../../../qa-roles/agents/automation-harness-bootstrapper.md),
  which consumes this blueprint's decisions as its inputs.
- Audit an existing framework against its own conventions. That is
  [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md).

## Step 1 - Inventory the system under test

Before any tool is named, record four facts about the SUT. Every later
decision keys off them.

| Inventory item | Questions to answer |
|---|---|
| **App stack** | Languages, frameworks, persistence (e.g. Node + React + Postgres). Which external services does it call (payments, email, auth provider)? |
| **Deployment shape** | Monolith / services / serverless? Can a full stack run locally (compose file, dev server) or only in a shared environment? |
| **Change shape** | Where do PRs land - one monorepo, or per-service repos? Do most changes touch the API, the UI, or both? The layer that changes most needs the fastest feedback. |
| **Team skills** | What languages do the engineers writing and maintaining tests already know? Per [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md) Step 1, the framework-language mismatch is the #1 maintenance cost. |

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
ecosystem, hire-ability) use
[`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md);
to have the decision made from the actual repo contents, dispatch
[`web-e2e-framework-selector`](../../../qa-web-e2e/agents/web-e2e-framework-selector.md),
which detects an existing convention from `package.json` and recommends
continuing with it unless there is a reason to switch.

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

Per the [Playwright test-fixtures docs](https://playwright.dev/docs/test-fixtures),
"test fixtures are used to establish the environment for each test, giving
the test everything it needs and nothing else", and fixtures are on-demand:
"Playwright Test will setup only the ones needed by your test and nothing
else." Playwright offers exactly two scopes
([test-fixtures docs](https://playwright.dev/docs/test-fixtures)):

| Scope | Lifecycle | Blueprint use |
|---|---|---|
| **Test** (default) | Set up before and torn down after each test | Anything a test mutates: pages, sessions, seeded records |
| **Worker** | Set up once per worker process; "Playwright Test will reuse the worker process for as many test files as it can, provided their worker fixtures match" | Expensive shared infrastructure tests only read, or per-worker isolated stores (database-per-worker) |

The blueprint records, per fixture: name, scope, what it provides, and
whether tests mutate it. The single rule from
[`test-isolation-patterns`](../test-isolation-patterns/SKILL.md) Pattern 2
applies verbatim: never share mutable fixtures across tests.

Mechanics to standardize in the conventions doc (all per the
[test-fixtures docs](https://playwright.dev/docs/test-fixtures)):

- Custom fixtures via `test.extend()`; teardown code follows `await use(...)`
  in the same function, so setup and teardown live together.
- Cross-cutting fixtures that every test needs (e.g. a network-stub guard)
  are declared `{ auto: true }`: they are "set up for each test/worker, even
  when the test does not list them directly."
- Fixture modules from separate concerns combine via `mergeTests()`; this is
  what makes the `fixtures/index.ts` single-import convention work.
- Tunable values (base URL, default user role) become option fixtures
  (`{ option: true }`) configured through `test.use()` per project.

### The pytest equivalent

If Step 2 chose Python, the same architecture maps onto pytest fixtures. Per
the [pytest fixtures how-to](https://docs.pytest.org/en/stable/how-to/fixtures.html),
tests request fixtures by declaring them as arguments; available scopes are
`function` (the default), `class`, `module`, `package`, and `session`, where
scope controls destruction (a `function`-scoped fixture "is destroyed at the
end of the test"; a `session`-scoped one at the end of the test session).
The `fixtures/index.ts` merged-export convention becomes `conftest.py`
(fixtures there are accessible to "tests from multiple test modules in the
directory"), teardown code goes after `yield`, and `{ auto: true }` becomes
`@pytest.fixture(autouse=True)`. Playwright's worker scope has no direct
pytest twin; `session` scope plus per-worker IDs (e.g. `pytest-xdist` worker
id) fills the same database-per-worker role.

## Step 4 - Object-model decision

Pick exactly **one** object-model pattern; mixing two in one codebase is the
top cross-cutting anti-pattern in
[`object-model-patterns`](../object-model-patterns/SKILL.md). The short
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
   [`seed-data-curator`](../../../qa-test-data/skills/seed-data-curator/SKILL.md)),
   or template-database cloning. The isolation mechanics
   (transaction-rollback vs database-per-worker vs template clone) come from
   [`test-isolation-patterns`](../test-isolation-patterns/SKILL.md) Pattern 4.
2. **Construction pattern.** Builder vs Factory vs Object Mother:
   [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md)
   is the catalog. Default for a new framework: Test Data Builder for the 2-3
   core domain objects, nothing else until duplication appears.
3. **Mock-server placement.** Which external dependencies get stubbed, and
   where the stub runs (in-process interception vs a standalone stub the
   whole stack points at). The tool choice per stack is exactly what
   [`mock-server-composer`](../../../qa-test-data/agents/mock-server-composer.md)
   automates (it composes WireMock / MSW / Mountebank by detected runtime);
   the blueprint records only the boundary: which services are real, which
   are stubbed, and in which layer.

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
  [`ci-test-job-conventions`](../../../qa-ci-integration/skills/ci-test-job-conventions/SKILL.md)
  §1 (no sharding under 2 minutes; 2-4 shards for a 10-30 minute suite) and
  record the trigger runtime in the blueprint. When sharding lands, the
  mechanics for the worked stack are `npx playwright test --shard=1/4` plus
  the blob reporter and `npx playwright merge-reports --reporter html`,
  per the [Playwright sharding docs](https://playwright.dev/docs/test-sharding).
- **Retry policy and per-trigger filtering** (what runs per-PR vs per-merge
  vs nightly) follow the cross-platform conventions in
  [`ci-test-job-conventions`](../../../qa-ci-integration/skills/ci-test-job-conventions/SKILL.md);
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

- [`test-code-critic`](../../agents/test-code-critic.md) runs per-PR on test
  file paths and flags per-file violations (structure, naming, magic numbers,
  slow setup).
- [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md)
  runs quarterly (or pre-release) and checks the cross-file tier, including
  documented-vs-actual convention drift: it reads this very conventions doc
  and flags where the codebase diverged from it.

## Worked example - "Ledgerly", a B2B invoicing web app

**The product:** Ledgerly lets accountants create, send, and reconcile
invoices. Node/Express API + Postgres, React (Vite) frontend, Stripe for
payments, one monorepo, full stack runs locally via Docker Compose. Team of
four: three TypeScript-fluent product engineers, one SDET. No test suite
beyond scattered React unit tests.

**Step 1 - Inventory.** Change shape: 70% of PRs touch the API or API + UI
together; UI-only PRs are rare. External dependency: Stripe. Coverage
decision: API integration layer (primary), thin web E2E for the five critical
journeys (create invoice, send, pay via Stripe redirect, reconcile, export),
unit stays with the packages, contract testing deferred (one team owns both
sides).

**Step 2 - Runner.** Team language is TypeScript; one runner can cover both
chosen layers, so Playwright Test takes the API tier (built-in `request`
fixture, isolated per test per the
[test-fixtures docs](https://playwright.dev/docs/test-fixtures)) and the E2E
tier. Rejected: Cypress (would still need a second runner for the API tier),
Jest + supertest (second runner for E2E).

**Step 3 - Layout + fixtures.**

```
tests/
  api/
    invoices/
    payments/
  e2e/
    invoicing/
    reconciliation/
  fixtures/
    db.ts
    auth.ts
    stripe-stub.ts
    index.ts
  pages/
  builders/
playwright.config.ts
docs/test-conventions.md
```

Fixture list (the blueprint's core table):

| Fixture | Scope | Provides | Mutated by tests? |
|---|---|---|---|
| `workerDb` | worker | Database-per-worker (`ledgerly_test_w${workerIndex}`), migrated once per worker | yes, via test-scoped children |
| `seededAccount` | test | One fresh accountant account + org in the worker DB | yes |
| `authedPage` | test | `page` logged in as `seededAccount` | yes |
| `api` | test | `request` context pre-authenticated against the API | yes |
| `stripeStub` | worker, `auto: true` | Asserts the Stripe stub container is up; fails fast if a test would hit real Stripe | no |

`db.ts`, `auth.ts`, and `stripe-stub.ts` are separate `test.extend()` modules
combined with `mergeTests()` into `fixtures/index.ts`, per the
[test-fixtures docs](https://playwright.dev/docs/test-fixtures).

**Step 4 - Object model.** POM + Component Objects: the SUT is a React SPA
with page-shaped flows and a shared nav/sidebar, suite projected well under
200 tests, so Screenplay overhead is not justified per the selection matrix
in [`object-model-patterns`](../object-model-patterns/SKILL.md). App Actions
rejected (not Cypress; no exposed store API). POM construction is deferred in
the implementation order until ~10 specs exist.

**Step 5 - Data + mocking.** Seed: empty DB + per-test creation through one
`invoiceBuilder` and one `accountBuilder` (Test Data Builder per
[`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md));
no shared seed set yet. Isolation: database-per-worker
([`test-isolation-patterns`](../test-isolation-patterns/SKILL.md) Pattern 4b)
because invoice tests are mutation-heavy. Dependencies: Postgres real (in
compose), Stripe stubbed by a stub container in `docker-compose.test.yml`
(tool choice delegated to
[`mock-server-composer`](../../../qa-test-data/agents/mock-server-composer.md)),
email captured by a local SMTP sink.

**Step 6 - CI matrix.** Reporters per the
[test-reporters docs](https://playwright.dev/docs/test-reporters):
`junit` + `blob` on CI, `html` locally.

| Trigger | Suite | Shards | Retry |
|---|---|---|---|
| Per-PR | `tests/api` + `tests/e2e/invoicing` (smoke) | none (est. < 5 min) | 0 |
| Merge to main | full `tests/` | none until runtime > 10 min, then 2-4 per [`ci-test-job-conventions`](../../../qa-ci-integration/skills/ci-test-job-conventions/SKILL.md) §1 | 1 on runner failure only |
| Nightly | full `tests/` against staging | as merge | 1, failures auto-filed |

**Step 7 - Conventions + gates.** `docs/test-conventions.md` holds all six
decision outputs above. [`test-code-critic`](../../agents/test-code-critic.md)
wired as a PR check on `tests/**`;
[`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md)
scheduled quarterly.

**Implementation order** (each step waits on the previous):

1. Scaffold the harness from the blueprint via
   [`automation-harness-bootstrapper`](../../../qa-roles/agents/automation-harness-bootstrapper.md)
   (stack `react+vite`, runner `playwright`).
2. `db.ts` worker fixtures + migrations + one API smoke test.
3. `auth.ts` + `stripe-stub.ts` fixtures; first E2E journey, raw locators.
4. CI: per-PR job with junit output.
5. After ~10 specs: extract `pages/` (POM) and `builders/` where duplication
   actually appeared.
6. Merge-to-main + nightly jobs; revisit sharding only when runtime crosses
   the §1 threshold.

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Copying the framework from a previous job regardless of change shape | The old framework encoded the old SUT's inventory (Step 1); a UI-heavy framework on an API-heavy product tests the wrong layer slowly |
| Building abstraction layers before ~10 tests exist | Abstractions extracted from zero usage guess wrong; extract from observed duplication (the rule-of-three framing in [`test-step-design-patterns`](../test-step-design-patterns/SKILL.md)) |
| One mega base-class every test inherits | Depth-3+ hierarchies break unpredictably on root changes, per [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) §A2; compose fixtures instead |
| Choosing the runner before the team-skills inventory | Framework-language mismatch is the #1 maintenance cost per [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md) |
| Designing the CI matrix for scale on day one (8 shards, 3 retries) | Retries hide flake in a young suite; shards add cost below the [`ci-test-job-conventions`](../../../qa-ci-integration/skills/ci-test-job-conventions/SKILL.md) §1 runtime thresholds |
| Skipping the written blueprint ("the code is the doc") | Documented-vs-actual drift becomes undetectable; the auditor's drift check needs a documented side to compare against |

## Limitations

- This skill **designs** the framework; it writes no code.
  [`automation-harness-bootstrapper`](../../../qa-roles/agents/automation-harness-bootstrapper.md)
  (qa-roles) scaffolds the skeleton from the blueprint, and the per-framework
  skills in qa-web-e2e (`playwright-testing`, `cypress-testing`, etc.)
  implement the actual tests.
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
- [`object-model-patterns`](../object-model-patterns/SKILL.md),
  [`test-isolation-patterns`](../test-isolation-patterns/SKILL.md),
  [`test-step-design-patterns`](../test-step-design-patterns/SKILL.md),
  [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md) -
  the sister pattern catalogs Steps 3-5 defer to.
- [`framework-choice-advisor`](../../../qa-process/skills/framework-choice-advisor/SKILL.md),
  [`web-e2e-framework-selector`](../../../qa-web-e2e/agents/web-e2e-framework-selector.md) -
  the Step 2 deep tools.
- [`ci-test-job-conventions`](../../../qa-ci-integration/skills/ci-test-job-conventions/SKILL.md) -
  the Step 6 conventions reference.
- [`automation-harness-bootstrapper`](../../../qa-roles/agents/automation-harness-bootstrapper.md),
  [`test-code-critic`](../../agents/test-code-critic.md),
  [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) -
  downstream scaffolder and enforcement loop.
