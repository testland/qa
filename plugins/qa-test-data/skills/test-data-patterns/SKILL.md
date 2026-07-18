---
name: test-data-patterns
description: "Pure reference catalog of the cross-language object-construction patterns for test data - Test Data Builder (Pryce/Freeman), Factory (with traits and associations), Object Mother, Fixture composition (per-test / per-describe / shared), Snapshot (defers to `golden-file-conventions` for the operational details), and Production-Data Anonymisation. Distinct from per-language data wrappers in this plugin (`factory-bot-data` Ruby, `faker-data` JS, `mimesis-data` Python, `bogus-data` .NET) which document tool-specific configuration; this catalog is the architecture-tier reference for choosing **which pattern** before reaching for the tool. Preloaded as the data-construction-tier reference for framework-architecture review."
---

# test-data-patterns

## Overview

This skill is a **pure reference** - no execution steps. It is the catalog cited when auditing a test framework's data-construction approach. It complements [`factory-bot-data`](../factory-bot-data/SKILL.md) (Ruby), [`faker-data`](../faker-data/SKILL.md) (JS), [`mimesis-data`](../mimesis-data/SKILL.md) (Python), [`bogus-data`](../bogus-data/SKILL.md) (.NET), [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) (cross-language), and [`golden-file-conventions`](../golden-file-conventions/SKILL.md) (snapshot pattern). Those skills document the tools; this skill documents the patterns.

## When to use

- Designing test-data construction strategy for a new framework - pick the right pattern before reaching for the tool.
- Auditing an existing framework where test data is the bottleneck (every test re-creates the world; tests run for minutes; data drifts between tests).
- Migrating between tools (Ruby's FactoryBot → Python's factory_boy, JS's Fishery → Python's Polyfactory) - the pattern stays; the tool changes.
- Onboarding engineers - point them at the canonical pattern citation.

Do **not** use this skill to:

- Configure a specific tool - that's the per-language skill in this plugin.
- Generate negative / boundary / parameterized test data - that's [`negative-test-generator`](../negative-test-generator/SKILL.md), [`boundary-value-generator`](../boundary-value-generator/SKILL.md), [`parameterized-test-generator`](../parameterized-test-generator/SKILL.md).
- Author an E2E seed fixture for the whole suite - that's [`seed-data-curator`](../seed-data-curator/SKILL.md).

## Pattern 1 - Test Data Builder

**Canonical source:** Nat Pryce and Steve Freeman, *Growing Object-Oriented Software, Guided by Tests* (2009) - the Test Data Builder pattern is named in chapter 22. Discussed in Pryce's blog post [Test Data Builders](http://www.natpryce.com/articles/000714.html) (the cross-language origin reference).

**Definition:** A Test Data Builder is a class with chainable methods (`.withName("Alice").withOrgId(42).build()`) that constructs domain objects step-by-step. Every field has a sensible default; the test overrides only the fields it cares about.

**Example (cross-language pseudocode):**

```typescript
// Default-everything builder; override only what matters
const user = aUser()
  .withRole("admin")
  .withOrg(anOrg().withPlan("enterprise"))
  .build();
```

### When to use Test Data Builder

- Domain objects have 5+ fields and most tests only care about 1-2.
- The team values explicit "what this test cares about" in the test body.
- The language has chainable / fluent API support (most modern languages).

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Builders with `.set<Field>(value)` for every field (no defaults) | Loses the pattern's benefit; every test specifies every field |
| Builders that mutate the object in place rather than returning a new one | Test cross-coupling: builders shared between tests leak state |
| Builders that perform side effects (`build()` writes to DB) | Mixes two concerns; the test cannot tell whether it's constructing or persisting |
| Builders for objects with 2 fields | Overhead exceeds benefit; use a struct literal |

## Pattern 2 - Factory (with traits and associations)

**Canonical source:** Thoughtbot's `factory_bot` (Ruby) is the cross-language reference implementation. The pattern itself predates the library - Joshua Kerievsky's *Refactoring to Patterns* (2004) traces it to the Gang of Four's Factory Method but adapted for test data.

**Definition:** A Factory is a registered, named template for creating an object. Traits are named modifiers (`:admin`, `:disabled`, `:premium`) that compose with the base template. Associations express relationships (`user.org`, `org.plan`).

**Example (Ruby FactoryBot, cited as the canonical implementation):**

```ruby
factory :user do
  name { Faker::Name.name }
  email { Faker::Internet.email }

  trait :admin do
    role { :admin }
  end

  trait :with_org do
    association :org, factory: :org
  end
end

# Test usage:
admin_user = create(:user, :admin, :with_org)
```

**Cross-language equivalents** (cite the canonical per-language tool):
- Ruby: `factory_bot` ([thoughtbot/factory_bot](https://github.com/thoughtbot/factory_bot)) - the origin.
- Python: `factory_boy` ([factoryboy/factory_boy](https://github.com/FactoryBoy/factory_boy)) - direct port.
- JS/TS: `fishery` ([thoughtbot/fishery](https://github.com/thoughtbot/fishery)), `@faker-js/faker` (lower-level).
- .NET: `Bogus` ([bchavez/Bogus](https://github.com/bchavez/Bogus)) - Faker-style with factory affordances.
- Java: `data-faker` + handwritten factory or test-data-builder-style libraries.

### When to use Factory

- The project uses a database (factories handle FK relationships via associations).
- The team is on Ruby / Python / JS-TS where mature factory libraries exist.
- Domain objects have many variants (admin / disabled / premium / legacy) - traits express each.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Factory definitions that hard-code IDs (`id: 1`) | Tests collide in parallel; factories must let the DB / Faker assign |
| Traits that overlap silently (`:admin` and `:premium` both set `role`) | Order-dependent behaviour; trait composition becomes unpredictable |
| Factories that persist by default (`create` is the only mode) | Slow tests, unnecessary DB writes. Builders should expose `build` / `attributes` / `create` strategies (see [`factory-bot-data`](../factory-bot-data/SKILL.md)) |
| One mega-factory for the entire domain | Becomes a god-object; every test pulls a fully-populated graph |

## Pattern 3 - Object Mother

**Canonical source:** [Martin Fowler - Object Mother](https://martinfowler.com/bliki/ObjectMother.html). Predates Test Data Builder; superseded by it for most use cases but still useful for stable canonical objects.

**Definition:** A central class (the "Mother") exposes named methods that return fully-constructed canonical test objects: `ObjectMother.standardUser()`, `ObjectMother.adminUser()`, `ObjectMother.userInOrgWithFiveMembers()`.

**Fowler's framing:** "An Object Mother is a class that contains methods that create well-known objects for use in tests." Useful when the team has a small, stable set of canonical fixtures.

### When to use Object Mother

- The domain has a small, stable set of canonical objects ("the test admin", "the seed catalogue").
- The team is on a language without first-class factory libraries (older Java, C++, legacy stacks).
- The Test Data Builder pattern is overkill for the small number of cases.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Object Mother that grows to 50+ methods | Becomes a god-class; engineers can't find the right factory |
| Methods that return shared mutable instances | Tests cross-couple through the Mother's return values |
| Mixing Mother with Builder (some objects via Mother, some via Builder) | Inconsistent test idiom; vocabulary drift |
| Mother methods with implicit dependencies (`adminUser()` requires `seedOrgs()` to have run) | Implicit ordering creates flakiness |

## Pattern 4 - Fixture composition

**Canonical source:** Gerard Meszaros, *xUnit Test Patterns: Refactoring Test Code* (2007) - the seminal reference for **Fresh Fixture**, **Shared Fixture**, **Implicit Setup**, **Delegated Setup**, and **Setup Decorator** patterns. The [Wikipedia entry on test fixture](https://en.wikipedia.org/wiki/Test_fixture) describes the four-phase test pattern (setup / exercise / verify / teardown) attributed to Meszaros.

**Definition:** Fixture composition is the pattern of building per-test state from reusable fragments. The three flavours:

| Flavour | When |
|---|---|
| **Fresh Fixture** | Each test creates its own state from scratch. Most isolated; slowest. |
| **Shared Fixture** | Multiple tests share one initialised state. Fastest; brittle to test ordering. |
| **Persistent Fresh Fixture** | Fresh state per test, but persisted in a transaction that rolls back at teardown. The pragmatic middle ground. |

**Fowler on the trade-off** ([Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)): "I prefer the former [Fresh Fixture], as it's often easier - and in particular easier to find the source of a problem." But: "rebuilding the database each time can add a lot of time to test runs, so that argues for switching to a clean-up strategy."

### When to use Fresh Fixture (default)

- Unit / integration tests with fast setup.
- Tests that mutate state (Shared Fixture would leak across tests).
- Anything parallel-executed.

### When to use Shared Fixture

- E2E tests where setup is genuinely expensive (multi-service stack, large seed data).
- Tests that *only read* the fixture (no mutation).
- The fixture is documented as immutable and the team enforces it.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Shared Fixture that some tests quietly mutate | Cross-test coupling; failures depend on test order |
| Fresh Fixture for a 30-minute E2E seed | Test suite time becomes infeasible; team starts skipping tests |
| Multiple fixture flavours in the same suite without explicit convention | Engineers can't tell what to write; bugs creep in |
| Fixture inheritance hierarchies >2 levels deep | Depth-3+ chains break unpredictably |

## Pattern 5 - Snapshot / golden-file

**Canonical source:** [Jest snapshot testing](https://jestjs.io/docs/snapshot-testing) is the cross-language reference for the test-code-side; [Michael Feathers' *Working Effectively with Legacy Code*](https://www.oreilly.com/library/view/working-effectively-with/0131177052/) coined "characterisation tests" which is the legacy-code-tier version of snapshot testing.

**Definition:** A snapshot test compares the current output of code under test to a previously-saved canonical output ("the golden file"). When the test runs, it serialises the output, compares against the file, fails if they differ. Engineers explicitly approve a new golden file when the change is intentional.

**This skill's role:** Snapshot is a recurring concept in test-data conversation, but the operational details (file naming, sanitisation of timestamps / IDs / PII, per-OS variants, review workflow) are documented in detail by [`golden-file-conventions`](../golden-file-conventions/SKILL.md). Reach for that skill for the operational catalog; this section is the pattern's catalog entry only.

### When to use Snapshot

- Output is structured and large (HTML render, JSON response, CLI output).
- Manual assertions would be tedious or wrong (50 fields to check).
- Changes to output are infrequent and require explicit approval anyway.

### When NOT to use Snapshot

- Output is non-deterministic (timestamps, UUIDs, locale, PII) - sanitise first or skip the snapshot.
- Output changes frequently - the team will rubber-stamp the snapshot update and lose the test's value.
- The behaviour you care about is one field - write an explicit assertion.

## Pattern 6 - Production-Data Anonymisation

**Canonical source:** Per ISO/IEC 25024 (data quality) and GDPR/CCPA legal requirements; practitioner adoption documented across [Tonic.ai](https://www.tonic.ai/), [Gretel.ai](https://gretel.ai/), [K2view](https://www.k2view.com/), and [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) (the marketplace's existing skill for synthesizing PII).

**Definition:** Anonymisation is the technique of using production data (or production-shaped data) for testing **after** removing or masking personally-identifiable information (PII), commercially-sensitive data, and any field that would breach privacy / compliance if leaked to a test environment.

**Why this is a pattern, not just a tool concern:** The pattern dictates that **no production data enters a test environment without anonymisation** - even if the test environment is "internal only." Cross-environment data leakage is the dominant security failure mode in test-data management ([2025 Verizon DBIR](https://www.verizon.com/business/resources/reports/dbir/) cited cross-environment data leakage as a top-10 breach pattern).

### The three anonymisation flavours

| Flavour | Definition | When |
|---|---|---|
| **Masking** | Replace sensitive fields with deterministic placeholders (`X***` for surnames; static fake date) | Production-shape preserved; field-level reversible if needed |
| **Synthesis** | Generate fake data that statistically resembles production (length distributions, locale mix) | No mapping back to production; safest |
| **Tokenisation** | Replace sensitive values with tokens that map back via a secured lookup | When the test environment needs to round-trip data to production (rare in QA) |

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Copying production DB to staging "for realism" | Cross-environment data leakage; GDPR / CCPA / HIPAA breach surface |
| Anonymisation that preserves the join keys | Sensitive relations (who bought what) survive the anonymisation |
| Anonymisation in CI that doesn't anonymise in dev local | Engineers have raw prod data on their laptops |
| Anonymisation as a one-time operation | Production data changes; anonymisation must run continuously |

## Pattern-selection guide

| Need | Pattern | When to mix |
|---|---|---|
| Few-fields, default-most strategy | Test Data Builder | Use Factory underneath the Builder for DB persistence |
| Many variants of one entity | Factory with traits | Combine with Builder for the test-API surface |
| Small stable set of canonical objects | Object Mother | Generally legacy; consider migrating to Builder + Factory |
| Per-test independence | Fresh Fixture | Always the default; reach for Shared only when measured slow |
| Read-only shared state | Shared Fixture | Document immutability; one mutation kills the contract |
| Large structured output | Snapshot / golden-file | See [`golden-file-conventions`](../golden-file-conventions/SKILL.md) for operational details |
| Production-shaped privacy-safe data | Anonymisation | Always for production-sourced data; pair with [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) |

## Cross-cutting anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Mixing all six patterns in one codebase | Engineers can't tell what to write; vocabulary fragments |
| Test data inline-literaled in tests (`{ name: "Alice", id: 1 }`) at scale | Refactors break 200 tests when one schema field changes |
| Test data setup that takes >5s per test | Suite time becomes infeasible; teams skip tests |
| Data construction and persistence collapsed into one method (`createUser()` always writes to DB) | Cannot test the construction logic without the DB |
| Implicit Setup (relies on global state from a previous test) | Tests become order-dependent; flake follows |
| Test data with PII / production keys | Compliance + security breach surface |

## Hand-off targets

- **Configure a specific per-language tool** → [`factory-bot-data`](../factory-bot-data/SKILL.md) (Ruby), [`faker-data`](../faker-data/SKILL.md) (JS), [`mimesis-data`](../mimesis-data/SKILL.md) (Python), [`bogus-data`](../bogus-data/SKILL.md) (.NET).
- **Build an E2E seed dataset** → [`seed-data-curator`](../seed-data-curator/SKILL.md).
- **Generate PII (anonymised) test data** → [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md).
- **Snapshot / golden-file operational details** → [`golden-file-conventions`](../golden-file-conventions/SKILL.md).
- **Generate negative / boundary / malicious test data** → [`negative-test-generator`](../negative-test-generator/SKILL.md), [`boundary-value-generator`](../boundary-value-generator/SKILL.md), [`malicious-payload-bank`](../malicious-payload-bank/SKILL.md).
- **Cross-test isolation / fixture scope rules** → `test-isolation-patterns` (sister catalog, in the qa-test-review plugin).
- **Object-model architecture patterns** → `object-model-patterns` (sister catalog).

## References

- Nat Pryce - *Test Data Builders* (the canonical reference for the Builder pattern as applied to test data): http://www.natpryce.com/articles/000714.html
- Nat Pryce and Steve Freeman - *Growing Object-Oriented Software, Guided by Tests* (2009), chapter 22: https://www.growing-object-oriented-software.com/
- Martin Fowler - *Object Mother* (canonical reference for the Object Mother pattern): https://martinfowler.com/bliki/ObjectMother.html
- Martin Fowler - *Eradicating Non-Determinism in Tests* (Fresh Fixture vs Shared Fixture trade-off, the load-bearing quote on test isolation): https://martinfowler.com/articles/nonDeterminism.html
- Gerard Meszaros - *xUnit Test Patterns: Refactoring Test Code* (2007) (the seminal reference for fixture patterns; cite by book ISBN 978-0131495050).
- thoughtbot - `factory_bot` (Ruby; the canonical Factory implementation): https://github.com/thoughtbot/factory_bot
- FactoryBoy team - `factory_boy` (Python equivalent): https://github.com/FactoryBoy/factory_boy
- thoughtbot - `fishery` (TypeScript Factory): https://github.com/thoughtbot/fishery
- Jest - Snapshot Testing (the cross-language reference for the snapshot pattern): https://jestjs.io/docs/snapshot-testing
- Michael Feathers - *Working Effectively with Legacy Code* (the characterisation-tests progenitor of golden-file testing): ISBN 978-0131177055.
- Wikipedia - *Test fixture* (Meszaros's four-phase test pattern): https://en.wikipedia.org/wiki/Test_fixture
- 2025 Verizon DBIR - cited for the cross-environment data leakage risk in production-data testing: https://www.verizon.com/business/resources/reports/dbir/
- ISTQB glossary - test data: https://glossary.istqb.org/en_US/term/test-data
- ISTQB glossary - fixture: https://glossary.istqb.org/en_US/term/test-fixture
- ISO/IEC 25024 - data quality model (cited for anonymisation requirements).
- [`factory-bot-data`](../factory-bot-data/SKILL.md), [`faker-data`](../faker-data/SKILL.md), [`mimesis-data`](../mimesis-data/SKILL.md), [`bogus-data`](../bogus-data/SKILL.md), [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md), [`golden-file-conventions`](../golden-file-conventions/SKILL.md), [`seed-data-curator`](../seed-data-curator/SKILL.md) - the per-tool and operational siblings in this plugin.
- `object-model-patterns`, `test-isolation-patterns`, `test-step-design-patterns` - sister architecture-tier pattern catalogs.
