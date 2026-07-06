# qa-property-based

Property-based testing for the QuickCheck-derived family. Per ISTQB: PBT is "a test approach in which test results are verified using specified relations between inputs and expected results of a test case." Each skill ships authoring + run + shrinking + CI integration for its language's canonical PBT library.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [hypothesis-testing](skills/hypothesis-testing/SKILL.md) | Python Hypothesis: `@given` + strategies + composite + `assume()` + settings + pytest integration. |
| Skill | [fast-check-testing](skills/fast-check-testing/SKILL.md) | JS/TS fast-check: `fc.assert(fc.property(...))` + arbitraries + combinators + race-condition detection + model-based testing. |
| Skill | [proptest-testing](skills/proptest-testing/SKILL.md) | Rust proptest: `proptest!` macro + regex-string strategies + `prop_compose!` + failure persistence. |
| Skill | [jqwik-testing](skills/jqwik-testing/SKILL.md) | JVM jqwik: `@Property` + `@ForAll` + Arbitraries API + `@Provide` + JUnit 5 integration. |
| Skill | [quickcheck-testing](skills/quickcheck-testing/SKILL.md) | Haskell QuickCheck (the original) + ScalaCheck: `quickCheck` / `forAll` + `Arbitrary` typeclass + `shrink`. |
| Agent | [property-based-tool-selector](agents/property-based-tool-selector.md) | Reads project markers (package.json / pyproject.toml / pom.xml / Cargo.toml / *.cabal / mix.exs) and recommends one library per language: fast-check (JS/TS), Hypothesis (Python), jqwik (JVM), proptest (Rust), QuickCheck (Haskell / Erlang / Elixir). |
| Agent | [property-based-test-author](agents/property-based-test-author.md) | Authors one property-based test per stated invariant (roundtrip / idempotence / conservation / monotonicity / commutativity / inverse / reference). Picks tool via property-based-tool-selector or accepts an override. Refuses to encode "test with random inputs" as a property - that's fuzzing or parameterized unit testing, not property-based. |
| Agent | [vacuous-property-critic](agents/vacuous-property-critic.md) | Adversarial read-only critic that detects vacuous and trivially-passing property tests in fast-check and Hypothesis suites. Flags over-restrictive preconditions (`assume()` / `fc.pre()` / `.filter()` discarding most inputs), missing or trivial assertions, under-powered generators, and implementation-restatement oracles. Emits BLOCK / PASS verdict with per-finding redesign recommendations. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-property-based@testland-qa
```
