---
name: quickcheck-testing
description: "Authors property-based tests for Haskell using QuickCheck (the original PBT library) and for Scala via ScalaCheck (the JVM port) - wires `quickCheck` (Haskell) / `forAll` (ScalaCheck) drivers, defines `Arbitrary` instances or generators, uses `shrink` to find minimal counterexamples, and integrates with HSpec / Tasty (Haskell) or specs2 / ScalaTest. Use when the codebase is Haskell or Scala and the team wants the canonical PBT library that the entire family (Hypothesis / fast-check / proptest / jqwik) was inspired by."
---

# quickcheck-testing

## Overview

QuickCheck is the original property-based testing library
([qc-hackage][qch]). This skill covers both:

- **QuickCheck** (Haskell) - the original.
- **ScalaCheck** (Scala / JVM) - the canonical port; same API
  shape, JVM ecosystem.

[qch]: https://hackage.haskell.org/package/QuickCheck

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

## Step 2 - Install (Scala)

```scala
// build.sbt
libraryDependencies += "org.scalacheck" %% "scalacheck" % "1.18.0" % Test

// For ScalaTest integration:
libraryDependencies += "org.scalatest" %% "scalatest-propspec" % "3.2.18" % Test
```

Pinned versions and update notes:
[references/quickcheck-reference.md](references/quickcheck-reference.md).

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

Define an `Arbitrary` instance with `arbitrary` (the generator) and
`shrink` (which returns simpler candidates for minimizing a failure):

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

The QuickCheck module map (`Test.QuickCheck.Gen`, `.Arbitrary`,
`.Function`, `.Monadic`):
[references/quickcheck-reference.md](references/quickcheck-reference.md).

## Step 5 - Combinators

`==>` is conditional implication - discard cases where the
precondition fails:

```haskell
-- Conditional property: discard cases where xs is empty
prop_headOfNonEmpty :: [Int] -> Property
prop_headOfNonEmpty xs = not (null xs) ==> head xs == xs !! 0
```

`forAll` (inline quantification) and `classify` / `label`
(distribution tracking):
[references/quickcheck-reference.md](references/quickcheck-reference.md).

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
of `quickCheck`. ScalaTest integration (`AnyPropSpec` +
`ScalaCheckPropertyChecks`):
[references/quickcheck-reference.md](references/quickcheck-reference.md).

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

## References

- [references/quickcheck-reference.md](references/quickcheck-reference.md) -
  module map, combinators, ScalaTest integration, anti-patterns,
  limitations, pinned versions.
- [qch][qch] - QuickCheck Haskell on Hackage: `quickCheck`,
  `Property` type, `Arbitrary` typeclass, `shrink`, `Test.QuickCheck.*`
  modules.
- ScalaCheck official site (`scalacheck.org`) - Scala port; same
  conceptual model, JVM ecosystem.
- `hypothesis-testing`,
  `fast-check-testing`,
  `proptest-testing`,
  `jqwik-testing` - all inspired by
  QuickCheck; per-language siblings.
