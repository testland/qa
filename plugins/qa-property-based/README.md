# qa-property-based

Property-based testing for the QuickCheck-derived family — entirely absent from the existing ecosystem (Tier 2 gap, 0 in corpus). Per ISTQB: PBT is "a test approach in which test results are verified using specified relations between inputs and expected results of a test case." Each skill ships authoring + run + shrinking + CI integration for its language's canonical PBT library.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [hypothesis-testing](skills/hypothesis-testing/SKILL.md) | S1 | Python Hypothesis: `@given` + strategies + composite + `assume()` + settings + pytest integration. |
| skill | [fast-check-testing](skills/fast-check-testing/SKILL.md) | S1 | JS/TS fast-check: `fc.assert(fc.property(...))` + arbitraries + combinators + race-condition detection + model-based testing. |
| skill | [proptest-testing](skills/proptest-testing/SKILL.md) | S1 | Rust proptest: `proptest!` macro + regex-string strategies + `prop_compose!` + failure persistence. |
| skill | [jqwik-testing](skills/jqwik-testing/SKILL.md) | S1 | JVM jqwik: `@Property` + `@ForAll` + Arbitraries API + `@Provide` + JUnit 5 integration. |
| skill | [quickcheck-testing](skills/quickcheck-testing/SKILL.md) | S1 | Haskell QuickCheck (the original) + ScalaCheck: `quickCheck` / `forAll` + `Arbitrary` typeclass + `shrink`. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-property-based@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
