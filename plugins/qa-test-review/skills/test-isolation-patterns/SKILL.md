---
name: test-isolation-patterns
description: "Pure reference catalog of test-isolation and fixture-lifecycle patterns - the four-phase test pattern (Meszaros), fixture scope (per-test / per-describe / shared / global), the Fresh-Fixture vs Shared-Fixture trade-off (Fowler), parallel-safety patterns, and cleanup discipline (afterEach / afterAll / tagged-cleanup), plus a pattern-selection guide and a worked leaking-state diagnosis. The database-isolation strategies (transaction-rollback / database-per-worker / template-database) and network / external-service stubbing live in references/. This is the architecture-tier reference, not a file-level fixture-coupling style rule. Use when designing fixture scope and isolation strategy, auditing fixture coupling or retry/wait policy, or moving a suite to parallel execution."
---

# test-isolation-patterns

## Overview

A test that fails sometimes for non-obvious reasons is non-deterministic. Per [Martin Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html): "A test is non-deterministic when it passes sometimes and fails sometimes, without any noticeable change in the code, tests, or environment… Once you start ignoring a regression test failure, then that test is useless and you might as well throw it away." The dominant cause is **broken isolation** - one test affecting another, the environment leaking, fixtures sharing state. This catalog is the canonical reference for the isolation patterns that prevent it.

This skill is a **pure reference** - no execution steps. It is the catalog cited when auditing fixture coupling, retry/wait policy consistency, and CI integration health. It complements `test-code-conventions §6` (which is the file-level rule against global-fixture hubs) with the cross-cutting architecture patterns. It also complements `flake-pattern-reference`, which catalogs flake symptoms; this skill catalogs the prevention patterns.

## When to use

- Designing a new framework - pick the fixture scope and isolation strategy.
- Auditing an existing framework where flake-rate is rising (broken isolation drives the concurrency and test-order-dependency flake categories, together about a third of flakes per [Luo et al. 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf)).
- Migrating from sequential to parallel execution - the parallel-safety patterns become load-bearing.
- Refactoring fixture inheritance chains - apply the cleanup-discipline patterns.

## How to use

1. **Frame each test in the four phases** (Pattern 1). Be explicit about where Setup and Teardown live, because Phases 1 and 4 are where isolation breaks.
2. **Pick the tightest fixture scope that holds** (Pattern 2). Default to per-test; escalate to per-describe or shared only when setup is measurably expensive **and** the group never mutates the fixture.
3. **Choose Fresh Fixture** (Pattern 3), or a Persistent Fresh Fixture (transaction-rollback) when a fresh rebuild is measured too slow.
4. **For DB-backed or network-backed tests, pick an external-dependency strategy** from [references/database-store-isolation.md](references/database-store-isolation.md) and [references/network-service-isolation.md](references/network-service-isolation.md).
5. **Before enabling parallel execution, apply the parallel-safety patterns** (Pattern 4): worker-scoped state, unique IDs, ephemeral paths, no global singletons.
6. **Wire teardown through the runner's `afterEach` by default** (Pattern 5, cleanup discipline).
7. **Cross-check against the pattern-selection guide and the cross-cutting anti-patterns** before sign-off.

## Pattern 1 - The four-phase test pattern

**Canonical source:** [Gerard Meszaros - *xUnit Test Patterns: Refactoring Test Code* (2007)](https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Code/dp/0131495054). Referenced in the [Wikipedia entry on test fixture](https://en.wikipedia.org/wiki/Test_fixture).

Every test has four phases:

| Phase | What |
|---|---|
| **1. Setup** | Establish the pre-conditions / fixture |
| **2. Exercise** | Interact with the System Under Test |
| **3. Verify** | Determine whether the expected outcome was obtained |
| **4. Teardown** | Return to a clean state |

Phases 1 and 4 together are **fixture management**. Patterns 2 through 5 below cover how to do them safely; isolating external stores and services is covered in the deep references.

## Pattern 2 - Fixture scope

The framework's test runner offers three or four scopes; the team picks the tightest scope that meets the constraint.

| Scope | Lifecycle | Use when |
|---|---|---|
| **Per-test (function-scoped)** | Setup before each test; teardown after each | Default. Maximally isolated. Slowest. Always parallel-safe. |
| **Per-describe (class / module-scoped)** | Setup before the first test in the group; teardown after the last | Setup is expensive **and** the group of tests genuinely shares it (read-only) |
| **Shared (session / worker-scoped)** | Setup once for the whole run; teardown at end | Setup is unaffordable per-describe (e.g., spinning up a Docker stack) and the tests don't mutate it |
| **Global (module-loading)** | Setup at module-import time; no teardown | Anti-pattern in nearly all cases. Use only for truly immutable language-level fixtures (constants, configuration). |

**The single rule that prevents most flake:** *never share mutable fixtures across tests.* If a fixture is mutated by any test, it must be per-test scoped.

### Framework-specific scope syntax (illustrative; cite the per-framework skill for tool-specific details)

- **Jest / Vitest**: `beforeEach` / `beforeAll` (per-describe by default within a `describe` block).
- **Playwright Test**: `test.beforeEach` / `test.beforeAll`; `test.use({})` for per-test config; fixtures via `test.extend()`.
- **pytest**: `@pytest.fixture(scope="function" | "class" | "module" | "session")`.
- **JUnit 5**: `@BeforeEach` / `@BeforeAll`; `@TestInstance(Lifecycle.PER_CLASS)`.
- **RSpec**: `before(:each)` / `before(:all)`.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Per-describe fixture that any test in the describe mutates | One test fails; the next "starts" from the mutated state |
| Shared fixture mutated through a leaky abstraction (e.g., factory returns a shared object) | Cross-test mutation without an obvious culprit; flake follows |
| Per-test scope for genuinely expensive setup (a 30s Docker spin-up per test) | Suite time explodes; team skips tests |
| Global fixture for anything that has state | Cannot reset between test runs; CI run pollutes the next run |
| Inheritance hierarchy of fixtures (`BaseTest` → `AppTest` → `DomainTest` → `SpecificTest`) | Depth-3+ chains break unpredictably (§A2) |

## Pattern 3 - Fresh Fixture vs Shared Fixture trade-off

**Canonical source:** [Martin Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html).

Fowler's framing: "I prefer the former [Fresh Fixture], as it's often easier - and in particular easier to find the source of a problem… [but] rebuilding the database each time can add a lot of time to test runs, so that argues for switching to a clean-up strategy."

| Approach | Setup cost | Isolation | When |
|---|---|---|---|
| **Fresh Fixture** (rebuild from scratch every test) | High | Maximum | Default; use unless measured slow |
| **Cleanup strategy** (preserve the fixture, undo changes at teardown) | Low | Strong if cleanup is comprehensive | When Fresh Fixture's cost is prohibitive |
| **Persistent Fresh Fixture** (fresh per test, persisted via transaction-rollback) | Low | Maximum | The pragmatic middle for DB-backed tests |

**The transaction-rollback pattern (Persistent Fresh Fixture):** Begin a transaction at test start; do all the test's DB work inside it; rollback at test end. The database is materially unchanged across tests. The pattern works for any DB that supports transactions; integration-test frameworks like `DatabaseCleaner` (Ruby), `pytest-django`'s `db` fixture, `Spring`'s `@Transactional` test annotation all implement it. The five DB-level strategies are catalogued in [references/database-store-isolation.md](references/database-store-isolation.md).

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Fresh Fixture that takes 60+ seconds per test | Suite time becomes prohibitive; team skips tests |
| Cleanup strategy that misses one mutation surface (cache; queue; file system) | Cross-test coupling through the missed surface |
| Transaction-rollback that doesn't actually rollback (autocommit, DDL changes) | Silent state leakage |
| Shared Fixture documented as "immutable" but tests mutate it anyway | The documentation is unverified; flake follows |

## Pattern 4 - Parallel safety

**Canonical source:** [Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html) on isolation as the parallel-safety prerequisite, plus [Luo et al. FSE 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf), which attributes 20% of flakes to concurrency problems (race conditions and deadlocks).

Parallel execution magnifies every isolation bug. The patterns that make parallel safe:

| Pattern | What it does |
|---|---|
| **Worker-scoped fixtures** | Each parallel worker has its own state (DB, file system path, port range) |
| **Unique identifiers per test** | Test names, file paths, generated IDs include the worker ID (`worker_${WORKER_ID}_user_${TEST_ID}`) |
| **Ephemeral output paths** | Tests write to `tmp/${WORKER_ID}/${TEST_ID}/` and clean up at teardown |
| **Port range allocation** | Each worker gets a port range (`30000 + WORKER_ID * 100`) to avoid binding conflicts |
| **No global singletons** | No `process.env` writes, no global config mutation, no static state |
| **Idempotent setup** | Re-running the setup produces the same state (so a flaky-and-retried test isn't tainted) |

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| `process.env.X = "..."` in a test (writes to a shared global) | Worker N's env-write affects worker M's reads |
| Hard-coded port 3000 in tests (port collisions) | First worker binds; others fail |
| Tests writing to `/tmp/test.log` (path collision) | Workers stomp each other's files |
| Test-name-based DB seeding (collides across workers if names overlap) | Cross-worker state pollution |
| Per-test setup that does `setTimeout` / `sleep` to "let things settle" | Flake source: async-wait is the largest flake category at 45% per [Luo et al. 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf); use proper event-based synchronisation |

## Pattern 5 - Cleanup discipline

**Canonical source:** Meszaros's *xUnit Test Patterns* (2007) - the **Garbage-Collected Teardown** vs **In-line Teardown** vs **Implicit Teardown** vs **Setup Decorator** patterns.

The four canonical cleanup approaches:

| Pattern | Mechanism |
|---|---|
| **In-line Teardown** | Each test explicitly cleans up at end (last line of the test body) |
| **Implicit Teardown** | `afterEach` / `afterAll` hooks the runner calls automatically |
| **Garbage-Collected Teardown** | Cleanup happens when the language's GC reclaims the fixture (typed in C# / Java with `IDisposable` / `AutoCloseable`) |
| **Tagged Cleanup** | Fixture registers itself with a "cleanup queue" at setup; queue drains at suite end |

**Rule:** Implicit Teardown via the runner's `afterEach` hook is the default. In-line Teardown is acceptable when the cleanup is specific to one test. Tagged Cleanup is for fixtures whose lifetime is variable (held across multiple tests, then released).

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| No teardown ("the next test will clean up") | Failing test orphans state; the next test fails too |
| Teardown that swallows errors silently | Real cleanup failures are invisible; flake follows |
| Teardown that depends on test-pass state (`if (test.passed) cleanup()`) | Failing tests don't clean up; cascading flake |
| Teardown order-dependent on setup order | Refactoring setup breaks teardown |

## Worked example - diagnosing a leaking-state test

**Symptom.** `updates a member's role` passes when its file runs alone but fails intermittently in the full suite - the classic order-dependent flake ([Fowler](https://martinfowler.com/articles/nonDeterminism.html)).

**The suite (before):**

```js
describe("member admin", () => {
  let user;
  beforeAll(() => { user = createUser({ role: "member" }); }); // per-describe scope

  it("promotes to admin", () => {
    promote(user);
    expect(user.role).toBe("admin"); // mutates the shared fixture
  });

  it("updates a member's role", () => {
    expect(user.role).toBe("member"); // fails: user was mutated above
  });
});
```

**Diagnosis.** Walk Pattern 2: `user` is a per-describe (`beforeAll`) fixture that the first test mutates. The second test inherits the mutated state. This is the Pattern 2 anti-pattern row "Per-describe fixture that any test in the describe mutates", and it violates the single rule that prevents most flake: never share mutable fixtures across tests.

**Fix.** Move the fixture to per-test (`beforeEach`) scope so each test gets a Fresh Fixture (Pattern 3):

```js
describe("member admin", () => {
  let user;
  beforeEach(() => { user = createUser({ role: "member" }); }); // per-test scope

  it("promotes to admin", () => {
    promote(user);
    expect(user.role).toBe("admin");
  });

  it("updates a member's role", () => {
    expect(user.role).toBe("member"); // always fresh; order-independent
  });
});
```

Each test now starts from a clean object - maximally isolated and parallel-safe. If `createUser` were genuinely expensive, the middle path is Pattern 3's Persistent Fresh Fixture (transaction-rollback), not a shared mutable object.

## Deep references

Once fixture scope is chosen, the two external-dependency concerns have their own deep catalogs:

- **Database / external-store isolation** - the five canonical strategies (transaction-rollback, database-per-worker, template-database, containerised, in-memory) with trade-offs and anti-patterns: [references/database-store-isolation.md](references/database-store-isolation.md).
- **Network / external-service isolation** - stub vs contract-test vs controlled-real-call, with anti-patterns: [references/network-service-isolation.md](references/network-service-isolation.md).

## Cross-cutting anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Implicit ordering (test B depends on test A's side effects) | Per [Fowler](https://martinfowler.com/articles/nonDeterminism.html): "isolation… gives you more flexibility in running subsets of tests and parallelizing tests." Ordering breaks both. |
| Tests that "sleep until it works" | Timing-fragile; async-wait is 45% of all flakes per [Luo et al. 2014](https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf) |
| Tests that read system time without overrides | Tests fail at midnight / DST / leap year |
| Tests that read random data without seeding | Non-reproducible failures |
| Tests that depend on file-system layout | OS / CI-runner-specific failures |
| Tests that depend on locale / timezone of the runner | Internationalisation-dependent flake |

## Pattern-selection guide

| Scenario | Recommended pattern |
|---|---|
| Default (unit / integration test) | Per-test fixture scope + Fresh Fixture |
| DB-backed integration test | Per-test fixture + transaction-rollback (Persistent Fresh Fixture) |
| Slow expensive E2E setup | Per-describe Shared Fixture **documented as immutable** + transactional teardown |
| Parallel execution | Worker-scoped DB + unique IDs per worker + ephemeral output paths |
| External service interaction | Stubs by default; contract tests at API surface; real-network only in smoke / canary |
| Multi-worker DB-heavy suite | Database-per-worker + template-database cloning |
| Mutation-heavy unit tests | Per-test fixture + in-memory mock |

## Hand-off targets

- **Per-file fixture coupling rule** → `test-code-conventions §6`.
- **Flake symptoms / pattern catalog** → `flake-pattern-reference` (qa-flake-triage) - symptoms; this skill is the prevention reference.
- **Quarantine a chronically flaky test** → `flaky-test-quarantine` (qa-flake-triage).
- **Stub / mock external services** → `msw-handlers`, `wiremock-stubs` (qa-test-data; multi-protocol Mountebank in wiremock-stubs references/).
- **Test data construction patterns** → `test-data-patterns` (qa-test-data, sister catalog).
- **Object-model architecture patterns** → `object-model-patterns` (sister catalog).
- **Test step granularity** → `test-code-conventions` §11 (step design).

## References

- Martin Fowler - *Eradicating Non-Determinism in Tests* (the load-bearing reference for Fresh-vs-Shared-Fixture trade-off and the "non-deterministic test is useless" rule): https://martinfowler.com/articles/nonDeterminism.html
- Martin Fowler - *Practical Test Pyramid* (cited for the in-memory-substitution anti-pattern): https://martinfowler.com/articles/practical-test-pyramid.html
- Gerard Meszaros - *xUnit Test Patterns: Refactoring Test Code* (2007) - the canonical reference for the four-phase test pattern and all named fixture / teardown patterns: ISBN 978-0131495050.
- Wikipedia - *Test fixture* (cites Meszaros's four-phase pattern): https://en.wikipedia.org/wiki/Test_fixture
- Luo et al. (FSE 2014) - *An Empirical Analysis of Flaky Tests* (the original academic taxonomy of flake categories: 45% async-wait, 20% concurrency, 12% test-order-dependency, from 201 fixes across 51 projects) which this catalog's patterns prevent: https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf
- Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" - flake prevalence (about 16% of tests show some flakiness): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- Testcontainers - https://testcontainers.com/ (the canonical containerised-DB-per-test reference)
- Gerard Meszaros - *Principles of Test Automation* ("Principle: Keep Tests Independent", also known as Independent Test - the canonical statement of the test-isolation principle this catalog implements): http://xunitpatterns.com/Principles%20of%20Test%20Automation.html
- ISTQB glossary - test fixture: https://glossary.istqb.org/en_US/term/test-fixture
- `test-code-conventions §6`, `flake-pattern-reference` (qa-flake-triage) - companion file-level and symptom-level references.
- `object-model-patterns`, `test-data-patterns` (qa-test-data) - sister architecture-tier pattern catalogs; step design is `test-code-conventions` §11.
