# qa-property-based

Property-based testing for the QuickCheck-derived family. Per ISTQB: PBT is "a test approach in which test results are verified using specified relations between inputs and expected results of a test case." Each skill ships authoring + run + shrinking + CI integration for its language's canonical PBT library.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [hypothesis-testing](skills/hypothesis-testing/SKILL.md) | Python Hypothesis: `@given` + strategies + composite + `assume()` + settings + pytest integration. |
| Skill | [fast-check-testing](skills/fast-check-testing/SKILL.md) | JS/TS fast-check: `fc.assert(fc.property(...))` + arbitraries + combinators + race-condition detection + model-based testing. |
| Skill | [proptest-testing](skills/proptest-testing/SKILL.md) | Rust proptest: `proptest!` macro + regex-string strategies + `prop_compose!` + failure persistence. |
| Skill | [jqwik-testing](skills/jqwik-testing/SKILL.md) | JVM jqwik: `@Property` + `@ForAll` + Arbitraries API + `@Provide` + JUnit 5 integration. |
| Agent | [property-based-test-author](agents/property-based-test-author.md) | Authors one property-based test per stated invariant (roundtrip / idempotence / conservation / monotonicity / commutativity / inverse / reference). Picks the tool from the decision table below or accepts an override. Refuses to encode "test with random inputs" as a property - that's fuzzing or parameterized unit testing, not property-based. |
| Agent | [vacuous-property-critic](agents/vacuous-property-critic.md) | Adversarial read-only critic that detects vacuous and trivially-passing property tests in fast-check and Hypothesis suites. Flags over-restrictive preconditions (`assume()` / `fc.pre()` / `.filter()` discarding most inputs), missing or trivial assertions, under-powered generators, and implementation-restatement oracles. Emits BLOCK / PASS verdict with per-finding redesign recommendations. |

## Choosing a library

One canonical property-based library per language - detect the language
from the project root and pick the matching row:

| Project signal | Language | Library | Skill |
| --- | --- | --- | --- |
| `package.json` (with or without TypeScript) | JavaScript / TypeScript | **fast-check** | `fast-check-testing` |
| `pyproject.toml` / `setup.py` | Python | **Hypothesis** | `hypothesis-testing` |
| `pom.xml` / `build.gradle*` | JVM (Java, Kotlin) | **jqwik** (JUnit 5 platform-native - JUnit 4 doesn't run it; on Kotest, its built-in property module is the alternative) | `jqwik-testing` |
| `Cargo.toml` | Rust | **proptest** | `proptest-testing` |

Languages outside this table (Haskell, Erlang, Elixir, Scala, Go, .NET,
Ruby, Swift) are not covered by this plugin - look for language-native
alternatives (QuickCheck ports, ScalaCheck, gopter, FsCheck, Rantly,
SwiftCheck). A one-off "run the function with random inputs" ask is not a
property - use a parameterized unit test; property-based testing earns its
keep when there's a meaningful invariant (roundtrip, idempotence,
conservation, monotonicity) to assert.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-property-based@testland-qa
```
