---
name: test-isolation-patterns
description: "Pure reference catalog of test-isolation and fixture-lifecycle patterns - fixture scope (per-test / per-describe / shared / global), Meszaros's four-phase test pattern, Fowler's Fresh-Fixture-vs-Shared-Fixture trade-off, database isolation (transaction-rollback / database-per-worker / template-database), parallel-safety patterns, and cleanup discipline (afterEach / afterAll / tagged-cleanup). Distinct from `test-code-conventions` §6 (file-level fixture coupling rule) - this catalog is the architecture-tier reference. Preloaded by `framework-architecture-auditor` to anchor the §A3 fixture-coupling and §A6 retry/wait audits."
rating: 25
d6: 5
archetype: S2
---

# test-isolation-patterns

## Overview

A test that fails sometimes for non-obvious reasons is non-deterministic. Per [Martin Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html): "A test is non-deterministic when it passes sometimes and fails sometimes, without any noticeable change in the code, tests, or environment… Once you start ignoring a regression test failure, then that test is useless and you might as well throw it away." The dominant cause is **broken isolation** - one test affecting another, the environment leaking, fixtures sharing state. This catalog is the canonical reference for the isolation patterns that prevent it.

This skill is a **pure reference** (S2) - no execution steps. It is the catalog the [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) cites when auditing fixture coupling (§A3), retry/wait policy consistency (§A6), and CI integration health (§A8). It complements [`test-code-conventions §6`](../test-code-conventions/SKILL.md) (which is the file-level rule against global-fixture hubs) with the cross-cutting architecture patterns. It also complements [`flake-pattern-reference`](../../../qa-flake-triage/skills/flake-pattern-reference/SKILL.md) which catalogs flake symptoms; this skill catalogs the prevention patterns.

## When to use

- Designing a new framework - pick the fixture scope and isolation strategy.
- Auditing an existing framework where flake-rate is rising (per [TestDino 2026](https://testdino.com/blog/flaky-test-benchmark), flake rates rose from 10% in 2022 to 26% in 2025 - broken isolation is the dominant cause).
- Migrating from sequential to parallel execution - the parallel-safety patterns become load-bearing.
- Refactoring fixture inheritance chains - apply the cleanup-discipline patterns.

## Pattern 1 - The four-phase test pattern

**Canonical source:** [Gerard Meszaros - *xUnit Test Patterns: Refactoring Test Code* (2007)](https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Code/dp/0131495054). Referenced in the [Wikipedia entry on test fixture](https://en.wikipedia.org/wiki/Test_fixture).

Every test has four phases:

| Phase | What |
|---|---|
| **1. Setup** | Establish the pre-conditions / fixture |
| **2. Exercise** | Interact with the System Under Test |
| **3. Verify** | Determine whether the expected outcome was obtained |
| **4. Teardown** | Return to a clean state |

Phases 1 and 4 together are **fixture management**. Patterns 2-6 below cover how to do them safely.

## Pattern 2 - Fixture scope

The framework's test runner offers three or four scopes; the team picks the tightest scope that meets the constraint.

| Scope | Lifecycle | Use when |
|---|---|---|
| **Per-test (function-scoped)** | Setup before each test; teardown after each | Default. Maximally isolated. Slowest. Always parallel-safe. |
| **Per-describe (class / module-scoped)** | Setup before the first test in the group; teardown after the last | Setup is expensive **and** the group of tests genuinely shares it (read-only) |
| **Shared (session / worker-scoped)** | Setup once for the whole run; teardown at end | Setup is unaffordable per-describe (e.g., spinning up a Docker stack) and the tests don't mutate it |
| **Global (module-loading)** | Setup at module-import time; no teardown | Anti-pattern in nearly all cases. Use only for truly immutable language-level fixtures (constants, configuration). |

**The single rule that prevents most flake:** *never share mutable fixtures across tests.* If a fixture is mutated by any test, it must be per-test scoped.

### Framework-specific scope syntax (illustrative; cite the per-framework S1 skill for tool-specific details)

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
| Inheritance hierarchy of fixtures (`BaseTest` → `AppTest` → `DomainTest` → `SpecificTest`) | Per [`framework-architecture-auditor §A2`](../../agents/framework-architecture-auditor.md), depth-3+ chains break unpredictably |

## Pattern 3 - Fresh Fixture vs Shared Fixture trade-off

**Canonical source:** [Martin Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html).

Fowler's framing: "I prefer the former [Fresh Fixture], as it's often easier - and in particular easier to find the source of a problem… [but] rebuilding the database each time can add a lot of time to test runs, so that argues for switching to a clean-up strategy."

| Approach | Setup cost | Isolation | When |
|---|---|---|---|
| **Fresh Fixture** (rebuild from scratch every test) | High | Maximum | Default; use unless measured slow |
| **Cleanup strategy** (preserve the fixture, undo changes at teardown) | Low | Strong if cleanup is comprehensive | When Fresh Fixture's cost is prohibitive |
| **Persistent Fresh Fixture** (fresh per test, persisted via transaction-rollback) | Low | Maximum | The pragmatic middle for DB-backed tests |

**The transaction-rollback pattern (Persistent Fresh Fixture):** Begin a transaction at test start; do all the test's DB work inside it; rollback at test end. The database is materially unchanged across tests. The pattern works for any DB that supports transactions; integration-test frameworks like `DatabaseCleaner` (Ruby), `pytest-django`'s `db` fixture, `Spring`'s `@Transactional` test annotation all implement it.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Fresh Fixture that takes 60+ seconds per test | Suite time becomes prohibitive; team skips tests |
| Cleanup strategy that misses one mutation surface (cache; queue; file system) | Cross-test coupling through the missed surface |
| Transaction-rollback that doesn't actually rollback (autocommit, DDL changes) | Silent state leakage |
| Shared Fixture documented as "immutable" but tests mutate it anyway | The documentation is unverified; flake follows |

## Pattern 4 - Database / external-store isolation

The dominant source of test flake at scale. Five canonical strategies, each with trade-offs.

### 4a - Transaction-rollback (the default)

Each test runs in a transaction; teardown rollbacks. Works for: relational DBs with full transaction support. Doesn't work for: DDL changes, multiple DB connections, queues, caches.

### 4b - Database-per-test-worker

Each parallel worker gets its own database (named `app_test_worker_1`, `app_test_worker_2`, etc.). Created once at startup; reused across tests within the worker; dropped at suite end. Works for: parallel execution with mutation-heavy tests. Cost: pre-suite setup time + N× DB storage.

### 4c - Template database / pristine clone

Pre-create a template database with seed data; clone it per test (or per worker). PostgreSQL's `CREATE DATABASE … TEMPLATE template_db` is the canonical mechanism. Works for: tests needing complex seed state. Cost: template maintenance.

### 4d - Containerised DB-per-test

Each test gets a fresh Docker container ([Testcontainers](https://testcontainers.com/) is the canonical library). Maximum isolation; highest cost. Works for: integration tests where the DB version / extensions / config matter. Don't use for: unit tests.

### 4e - In-memory substitution

Use SQLite in-memory instead of the production DB engine. Fast; works for simple SQL. Doesn't work for: production-specific features (PostgreSQL JSON, Postgres extensions, MySQL spatial types). Cited as an anti-pattern by [Fowler on integration tests](https://martinfowler.com/articles/practical-test-pyramid.html) when the production engine has features the in-memory substitute lacks.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Tests that mutate a shared DB without isolation | Cross-test coupling; the dominant source of flake at scale |
| In-memory substitution masking production-engine differences | Tests pass locally; fail in production |
| Transaction-rollback for tests that do DDL (CREATE TABLE in test) | DDL is auto-commit in most engines; rollback doesn't undo it |
| Database-per-worker without a maximum-worker limit | Storage explodes; CI cost surges |
| Containerised DB-per-test for unit tests | 5-second container startup × 1000 unit tests = unworkable |

## Pattern 5 - Parallel safety

**Canonical source:** [Fowler - *Eradicating Non-Determinism in Tests*](https://martinfowler.com/articles/nonDeterminism.html) on isolation as the parallel-safety prerequisite + [TestDino 2026 flake benchmark](https://testdino.com/blog/flaky-test-benchmark) which attributes 20% of flakes to "concurrency problems: race conditions and deadlocks" (after Luo et al. FSE 2014).

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
| Per-test setup that does `setTimeout` / `sleep` to "let things settle" | Flake source per [TestDino 2026 §async-wait - 45% of flakes](https://testdino.com/blog/flaky-test-benchmark); use proper event-based synchronisation |

## Pattern 6 - Cleanup discipline

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

## Pattern 7 - Network / external-service isolation

Tests should not depend on external services they don't control. Three patterns:

| Pattern | When |
|---|---|
| **Stub (canned response)** | The test doesn't care about the network; use a stub library ([nock](https://github.com/nock/nock), [WireMock](https://wiremock.org/), [Mountebank](http://www.mbtest.org/), [`msw-handlers`](../../../qa-test-data/skills/msw-handlers/SKILL.md), [`wiremock-stubs`](../../../qa-test-data/skills/wiremock-stubs/SKILL.md), [`mountebank-imposters`](../../../qa-test-data/skills/mountebank-imposters/SKILL.md)) |
| **Contract test** | The test cares whether the service contract holds; use [Pact](https://docs.pact.io/) or [schemathesis](https://schemathesis.readthedocs.io/) |
| **Real network call in a controlled environment** | Smoke / canary test in a staging tier with a dedicated test partition |

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Unit tests calling the real external API | Tests fail when the API is down; tests pass when the API silently changes |
| Stubs that drift from production response shape | Tests pass with stubs that don't match reality |
| One global stub for the whole suite | Tests cross-couple through the stub configuration |
| Contract test with no contract refresh | Stub goes stale; tests pass while production breaks |

## Cross-cutting anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Implicit ordering (test B depends on test A's side effects) | Per [Fowler](https://martinfowler.com/articles/nonDeterminism.html): "isolation… gives you more flexibility in running subsets of tests and parallelizing tests." Ordering breaks both. |
| Tests that "sleep until it works" | Timing-fragile; 45% of all flakes per [TestDino 2026](https://testdino.com/blog/flaky-test-benchmark) |
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

- **Audit a framework's isolation strategy** → [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) (preloads this skill).
- **Per-file fixture coupling rule** → [`test-code-conventions §6`](../test-code-conventions/SKILL.md).
- **Flake symptoms / pattern catalog** → [`flake-pattern-reference`](../../../qa-flake-triage/skills/flake-pattern-reference/SKILL.md) - symptoms; this skill is the prevention reference.
- **Classify a single failing test** → [`failure-classifier`](../../../qa-bug-repro/agents/failure-classifier.md).
- **Quarantine a chronically flaky test** → [`flaky-test-quarantine`](../../../qa-flake-triage/skills/flaky-test-quarantine/SKILL.md).
- **Stub / mock external services** → [`msw-handlers`](../../../qa-test-data/skills/msw-handlers/SKILL.md), [`wiremock-stubs`](../../../qa-test-data/skills/wiremock-stubs/SKILL.md), [`mountebank-imposters`](../../../qa-test-data/skills/mountebank-imposters/SKILL.md).
- **Test data construction patterns** → [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md) (sister catalog).
- **Object-model architecture patterns** → [`object-model-patterns`](../object-model-patterns/SKILL.md) (sister catalog).
- **Test step granularity** → [`test-step-design-patterns`](../test-step-design-patterns/SKILL.md) (sister catalog).

## References

- Martin Fowler - *Eradicating Non-Determinism in Tests* (the load-bearing reference for Fresh-vs-Shared-Fixture trade-off and the "non-deterministic test is useless" rule): https://martinfowler.com/articles/nonDeterminism.html
- Martin Fowler - *Practical Test Pyramid* (cited for the in-memory-substitution anti-pattern): https://martinfowler.com/articles/practical-test-pyramid.html
- Gerard Meszaros - *xUnit Test Patterns: Refactoring Test Code* (2007) - the canonical reference for the four-phase test pattern and all named fixture / teardown patterns: ISBN 978-0131495050.
- Wikipedia - *Test fixture* (cites Meszaros's four-phase pattern): https://en.wikipedia.org/wiki/Test_fixture
- TestDino Flaky Test Benchmark 2026 - flake rate trend (10% → 26%) and root-cause breakdown (45% async-wait, 20% concurrency, 12% order-dependent, 8% resource leaks) which this catalog's patterns prevent: https://testdino.com/blog/flaky-test-benchmark
- Luo et al. (FSE 2014) - *An Empirical Analysis of Flaky Tests* (the original academic taxonomy of flake categories cited in TestDino): https://mir.cs.illinois.edu/marinov/publications/LuoETAL14FlakyTestsAnalysis.pdf
- Testcontainers - https://testcontainers.com/ (the canonical containerised-DB-per-test reference)
- ISTQB glossary - test isolation: https://glossary.istqb.org/en_US/term/independent-testing
- ISTQB glossary - test fixture: https://glossary.istqb.org/en_US/term/test-fixture
- ISTQB glossary - flaky test: https://glossary.istqb.org/en_US/term/flaky-test
- [`test-code-conventions §6`](../test-code-conventions/SKILL.md), [`flake-pattern-reference`](../../../qa-flake-triage/skills/flake-pattern-reference/SKILL.md), [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) - companion file-level / symptom-level / audit-level references.
- [`object-model-patterns`](../object-model-patterns/SKILL.md), [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md), [`test-step-design-patterns`](../test-step-design-patterns/SKILL.md) - sister architecture-tier pattern catalogs.
