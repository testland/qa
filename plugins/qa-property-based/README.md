# qa-property-based

Property-based testing for the QuickCheck-derived family. Per ISTQB: PBT is "a test approach in which test results are verified using specified relations between inputs and expected results of a test case." Each skill ships authoring + run + shrinking + CI integration for its language's canonical PBT library.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [hypothesis-testing](skills/hypothesis-testing/SKILL.md) | S1 | Python Hypothesis: `@given` + strategies + composite + `assume()` + settings + pytest integration. |
| Skill | [fast-check-testing](skills/fast-check-testing/SKILL.md) | S1 | JS/TS fast-check: `fc.assert(fc.property(...))` + arbitraries + combinators + race-condition detection + model-based testing. |
| Skill | [proptest-testing](skills/proptest-testing/SKILL.md) | S1 | Rust proptest: `proptest!` macro + regex-string strategies + `prop_compose!` + failure persistence. |
| Skill | [jqwik-testing](skills/jqwik-testing/SKILL.md) | S1 | JVM jqwik: `@Property` + `@ForAll` + Arbitraries API + `@Provide` + JUnit 5 integration. |
| Skill | [quickcheck-testing](skills/quickcheck-testing/SKILL.md) | S1 | Haskell QuickCheck (the original) + ScalaCheck: `quickCheck` / `forAll` + `Arbitrary` typeclass + `shrink`. |
| Agent | [property-based-tool-selector](agents/property-based-tool-selector.md) | A2 | Reads project markers (package.json / pyproject.toml / pom.xml / Cargo.toml / *.cabal / mix.exs) and recommends one library per language: fast-check (JS/TS), Hypothesis (Python), jqwik (JVM), proptest (Rust), QuickCheck (Haskell / Erlang / Elixir). |
| Agent | [property-based-test-author](agents/property-based-test-author.md) | A2 | Authors one property-based test per stated invariant (roundtrip / idempotence / conservation / monotonicity / commutativity / inverse / reference). Picks tool via property-based-tool-selector or accepts an override. Refuses to encode "test with random inputs" as a property — that's fuzzing or parameterized unit testing, not property-based. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-property-based@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
