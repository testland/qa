# QuickCheck / ScalaCheck reference

Detailed lookup material for `quickcheck-testing`. Sources:
[QuickCheck on Hackage][qch], ScalaCheck (`scalacheck.org`).

[qch]: https://hackage.haskell.org/package/QuickCheck

## Pinned versions

- QuickCheck (Haskell): `2.18.0.0` latest stable at source-fetch (`build-depends: QuickCheck >= 2.18`).
- ScalaCheck (Scala): `1.18.0`; ScalaTest-plus integration via `scalatest-propspec` `3.2.18`.

Check the sources before bumping.

## QuickCheck modules

| Module                          | Use                                         |
|---------------------------------|---------------------------------------------|
| `Test.QuickCheck`               | Main entry: `quickCheck`, `verboseCheck`.   |
| `Test.QuickCheck.Arbitrary`     | `Arbitrary` typeclass for custom types.     |
| `Test.QuickCheck.Gen`           | Custom generators.                          |
| `Test.QuickCheck.Function`      | Function generation.                        |
| `Test.QuickCheck.Monadic`       | "for testing stateful/monadic code" ([qch]). |

## Combinators (Haskell)

```haskell
-- Quantify per-test scope
prop_sortIdempotent :: Property
prop_sortIdempotent = forAll (listOf1 arbitrary :: Gen [Int]) $ \xs ->
  sort (sort xs) == sort xs

-- Classify cases for distribution monitoring
prop_lengthClassified :: [Int] -> Property
prop_lengthClassified xs = classify (null xs) "empty" $
                            classify (length xs > 100) "large" $
                            length (reverse xs) == length xs
```

`forAll` quantifies inline; `classify` / `label` track distribution.

## ScalaTest integration

```scala
import org.scalatest.propspec.AnyPropSpec
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.scalacheck.ScalaCheckPropertyChecks

class UserPropSpec extends AnyPropSpec with Matchers with ScalaCheckPropertyChecks {

  property("reverse is involutive") {
    forAll { (xs: List[Int]) =>
      xs.reverse.reverse shouldBe xs
    }
  }
}
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping `shrink` in custom `Arbitrary`                               | Failures aren't shrunk; counterexample messages are huge.                 | Always implement `shrink` (Step 4). |
| Heavy `==>` (Haskell) / `suchThat` (Scala) preconditions               | Cases discarded; "Gave up after N tests" warning.                         | Restructure the generator to produce only valid inputs (Step 4-5). |
| `arbitrary` without `Arbitrary` typeclass instance for custom types    | Compile error / runtime "no instance" - must define instance per type.   | Define `Arbitrary T` instance (Step 4). |
| Random seed in CI                                                       | Failures hard to reproduce.                                              | Fixed seed (Step 8). |
| `quickCheck` from `Main`                                                | Mixes test code with executable.                                          | Use HSpec / Tasty (Haskell) or ScalaTest (Scala) for organization. |
| Properties that always pass trivially                                   | No actual verification; false confidence.                                | `verboseCheck` to see distribution; reformulate. |

## Limitations

- **Haskell-specific syntax** (Haskell QuickCheck only). Teams
  unfamiliar with Haskell will find the syntax off-putting; ScalaCheck
  is more accessible.
- **Older API quirks.** QuickCheck pre-dates many modern PBT
  conveniences; jqwik / Hypothesis ergonomics are smoother for
  newcomers.
- **No race-condition detection.** Unlike fast-check's `fc.scheduler`,
  basic QuickCheck doesn't model concurrent interleavings.
- **Shrinking can be slow.** Custom `shrink` implementations need
  care to terminate.
- **ScalaCheck integration with ScalaTest** can be confusing when
  multiple property-checking integrations exist (ScalaTest's own
  generators vs ScalaCheck's).
