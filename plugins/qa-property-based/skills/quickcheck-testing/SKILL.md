---
name: quickcheck-testing
description: "Authors property-based tests for Haskell using QuickCheck (the original PBT library) and for Scala via ScalaCheck (the JVM port) - wires `quickCheck` (Haskell) / `forAll` (ScalaCheck) drivers, defines `Arbitrary` instances or generators, uses `shrink` to find minimal counterexamples, and integrates with HSpec / Tasty (Haskell) or specs2 / ScalaTest. Use when the codebase is Haskell or Scala and the team wants the canonical PBT library that the entire family (Hypothesis / fast-check / proptest / jqwik) was inspired by."
rating: 22
d6: 3
---

# quickcheck-testing

## Overview

Per [qc-hackage][qch]:

[qch]: https://hackage.haskell.org/package/QuickCheck

> "**QuickCheck** is a Haskell library for automatic property-based
> testing. ... 'The programmer provides a specification of the
> program, in the form of properties which functions should
> satisfy, and QuickCheck then tests that the properties hold in a
> large number of randomly generated cases.'" ([qc-hackage][qch])

This skill covers both:

- **QuickCheck** (Haskell) - the original.
- **ScalaCheck** (Scala / JVM) - the canonical port; same API
  shape, JVM ecosystem.

## When to use

- The codebase is Haskell - QuickCheck is the canonical choice.
- The codebase is Scala - ScalaCheck is well-integrated with
  ScalaTest, specs2, and pure Scala test runners.
- A multi-language project wants PBT consistency; the QuickCheck
  vocabulary (arbitrary, shrink, property) is the lingua franca.

## Step 1 - Install (Haskell)

```haskell
-- In .cabal:
build-depends: QuickCheck >= 2.18

-- In stack.yaml: add 'QuickCheck' to extra-deps if not in resolver
```

Per [qc-hackage][qch], version 2.18.0.0 is the latest stable.

## Step 2 - Install (Scala)

```scala
// build.sbt
libraryDependencies += "org.scalacheck" %% "scalacheck" % "1.18.0" % Test

// For ScalaTest integration:
libraryDependencies += "org.scalatest" %% "scalatest-propspec" % "3.2.18" % Test
```

## Step 3 - Basic Haskell property

```haskell
import Test.QuickCheck

prop_reverseInvolutive :: [Int] -> Bool
prop_reverseInvolutive xs = reverse (reverse xs) == xs

main :: IO ()
main = quickCheck prop_reverseInvolutive
```

`quickCheck` runs the property with 100 random `[Int]` values by
default; on failure, prints the failing case + the shrunk minimal
example.

For ghci:

```haskell
ghci> quickCheck prop_reverseInvolutive
+++ OK, passed 100 tests.
```

## Step 4 - Custom generators

Per [qc-hackage][qch], QuickCheck provides:

| Module                          | Use                                         |
|---------------------------------|---------------------------------------------|
| `Test.QuickCheck`               | Main entry: `quickCheck`, `verboseCheck`.   |
| `Test.QuickCheck.Arbitrary`     | `Arbitrary` typeclass for custom types.     |
| `Test.QuickCheck.Gen`           | Custom generators.                          |
| `Test.QuickCheck.Function`      | Function generation.                        |
| `Test.QuickCheck.Monadic`       | "for testing stateful/monadic code" ([qc-hackage][qch]). |

A custom `Arbitrary` instance:

```haskell
data User = User { userId :: Int, userEmail :: String, userAge :: Int }
  deriving (Show, Eq)

instance Arbitrary User where
  arbitrary = do
    uid <- arbitrary `suchThat` (> 0)
    name <- listOf1 (elements ['a'..'z'])
    age <- choose (18, 100)
    return $ User uid (name ++ "@example.com") age

  shrink (User i e a) =
    [ User i' e a | i' <- shrink i, i' > 0 ] ++
    [ User i e a' | a' <- shrink a, a' >= 18, a' <= 100 ]
```

`shrink` is the function that, given a failing `User`, returns
candidate simpler `User`s. QuickCheck tries each until it finds the
smallest still-failing case.

## Step 5 - Combinators

```haskell
-- Conditional property: discard cases where xs is empty
prop_headOfNonEmpty :: [Int] -> Property
prop_headOfNonEmpty xs = not (null xs) ==> head xs == xs !! 0

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

`==>` is conditional implication: discard cases where the
precondition fails. `forAll` quantifies inline. `classify` /
`label` track distribution.

## Step 6 - ScalaCheck equivalent

```scala
import org.scalacheck._
import org.scalacheck.Prop.forAll

object UserSpecification extends Properties("User") {

  implicit val userGen: Arbitrary[User] = Arbitrary {
    for {
      id <- Gen.posNum[Int]
      name <- Gen.alphaLowerStr.suchThat(_.length >= 3)
      age <- Gen.choose(18, 100)
    } yield User(id, s"$name@example.com", age)
  }

  property("json round-trip") = forAll { (u: User) =>
    val json = encode(u)
    decode[User](json) == Right(u)
  }

  property("sorted list stays sorted") = forAll { (xs: List[Int]) =>
    val sorted = xs.sorted
    sorted == sorted.sorted
  }
}
```

Same shape as Haskell QuickCheck; `Prop.forAll` is the equivalent
of `quickCheck`.

For ScalaTest integration:

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

## Step 7 - Configuration

Haskell:

```haskell
import Test.QuickCheck

main = quickCheckWith (stdArgs { maxSuccess = 1000, maxSize = 100 }) prop_X
-- or:
quickCheckWith (stdArgs { maxSuccess = 100, maxSize = 50, maxDiscardRatio = 10 }) prop_X
```

Scala:

```scala
import org.scalacheck.Test
import org.scalacheck.Prop

val params = Test.Parameters.default
  .withMinSuccessfulTests(1000)
  .withMaxDiscardRatio(10.0f)
```

## Step 8 - CI integration

Haskell with cabal:

```bash
cabal test
```

Scala with sbt:

```bash
sbt test
```

For deterministic CI, set the seed:

```haskell
quickCheckWith (stdArgs { replay = Just (mkQCGen 42, 0) }) prop_X
```

```scala
val params = Test.Parameters.default.withInitialSeed(rng.Seed(42L))
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

## References

- [qch][qch] - QuickCheck Haskell on Hackage: `quickCheck`,
  `Property` type, `Arbitrary` typeclass, `shrink`, `Test.QuickCheck.*`
  modules, current version 2.18.0.0.
- ScalaCheck official site (`scalacheck.org`) - Scala port; same
  conceptual model, JVM ecosystem.
- [`hypothesis-testing`](../hypothesis-testing/SKILL.md),
  [`fast-check-testing`](../fast-check-testing/SKILL.md),
  [`proptest-testing`](../proptest-testing/SKILL.md),
  [`jqwik-testing`](../jqwik-testing/SKILL.md) - all inspired by
  QuickCheck; per-language siblings.
