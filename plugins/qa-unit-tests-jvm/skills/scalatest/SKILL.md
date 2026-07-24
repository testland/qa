---
name: scalatest
description: "Configures and runs ScalaTest - Scala-native test framework with multiple specification styles (FlatSpec, FunSuite, WordSpec, FreeSpec, AsyncFlatSpec for async); Matchers DSL (`should equal`, `should contain`, `shouldBe a [Class]`); integrates with ScalaCheck for property-based testing; sbt + Maven + Gradle support; tagged-test selective execution. Use when working with Scala codebases."
---

# scalatest

## Overview

Per [scalatest.org][st]:

[st]: https://www.scalatest.org/

ScalaTest is the de facto Scala testing framework. Like Kotest, it
offers multiple specification styles to match team preference.

For Java/Kotlin projects, `junit5-tests`
or `kotest-tests` are more idiomatic.
ScalaTest is the right pick for Scala-primary or Scala-only projects.

## When to use

- Scala project (Scala 2.13 or Scala 3).
- Existing ScalaTest codebase.
- Property-based testing alongside ScalaCheck (canonical pairing).

## Step 1 - Install

`build.sbt`:

```scala
libraryDependencies += "org.scalatest" %% "scalatest" % "3.2.19" % Test
libraryDependencies += "org.scalatestplus" %% "scalacheck-1-17" % "3.2.18.0" % Test
```

Test files live under `src/test/scala/`.

## Step 2 - Specification styles

Per [scalatest.org/user_guide/selecting_a_style][st-styles]:

[st-styles]: https://www.scalatest.org/user_guide/selecting_a_style

8+ styles. Common picks:

**FlatSpec** (BDD-style):

```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CalculatorSpec extends AnyFlatSpec with Matchers {
  "Calculator" should "add two numbers" in {
    Calculator.add(1, 2) should equal(3)
  }

  it should "throw on overflow" in {
    an [ArithmeticException] should be thrownBy {
      Calculator.add(Int.MaxValue, 1)
    }
  }
}
```

**FunSuite** (xUnit-style):

```scala
import org.scalatest.funsuite.AnyFunSuite

class CalculatorSuite extends AnyFunSuite {
  test("add two numbers") {
    assert(Calculator.add(1, 2) == 3)
  }
}
```

**WordSpec** (deeply-nested BDD):

```scala
import org.scalatest.wordspec.AnyWordSpec

class UserServiceSpec extends AnyWordSpec with Matchers {
  "A UserService" when {
    "creating a user" should {
      "set default role" in {
        UserService.create("alice").role shouldBe "user"
      }
    }
  }
}
```

Pick one style per project + stick with it.

## Step 3 - Matchers DSL

Per [scalatest.org/user_guide/using_matchers][st-matchers]:

[st-matchers]: https://www.scalatest.org/user_guide/using_matchers

```scala
result should equal(42)
result shouldBe 42                    // strict equality (uses ==)
result shouldEqual 42                  // similar to equal but no parens
result should not equal 0
list should have size 5
list should contain("alice")
list should contain only("alice", "bob")
list should contain inOrder("alice", "bob")
map should contain key("alice")
map should contain value(42)
string should startWith("hello")
string should fullyMatch regex("\\d+")
opt shouldBe defined
opt shouldBe a [Some[_]]
result shouldBe a [Right[_, _]]
either shouldBe Right(42)
result should be > 10
result should be (within(1.0) of 42.0)   // float tolerance
```

For full Matchers reference, see [st-matchers][st-matchers].

## Step 4 - Async tests

```scala
import org.scalatest.flatspec.AsyncFlatSpec
import scala.concurrent.Future

class AsyncSpec extends AsyncFlatSpec with Matchers {
  "fetchUser" should "return user data" in {
    fetchUser(1) map { user =>
      user.id shouldBe 1
    }
  }
}
```

`AsyncFlatSpec` test bodies return `Future[Assertion]` - ScalaTest
handles the async lifecycle.

## Step 5 - ScalaCheck integration

```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatestplus.scalacheck.ScalaCheckPropertyChecks
import org.scalacheck.Gen

class PropertyCheckSpec extends AnyFlatSpec with Matchers
                          with ScalaCheckPropertyChecks {
  "addition" should "be commutative" in {
    forAll { (a: Int, b: Int) =>
      a + b shouldBe b + a
    }
  }

  "concatenation length" should "be sum of lengths" in {
    forAll(Gen.alphaStr, Gen.alphaStr) { (a, b) =>
      (a + b).length shouldBe a.length + b.length
    }
  }
}
```

Cross-ref `quickcheck-testing` (in the qa-property-based plugin)
for the property-based discipline (covers QuickCheck + ScalaCheck).

## Step 6 - Lifecycle hooks

```scala
class WithFixturesSpec extends AnyFlatSpec with BeforeAndAfterAll
                         with BeforeAndAfter with Matchers {
  override def beforeAll(): Unit = {
    // once before all tests
  }

  override def afterAll(): Unit = {
    // once after all tests
  }

  before {
    // before each test
  }

  after {
    // after each test
  }
}
```

Or use the loan-fixture pattern (functional style):

```scala
def withDatabase(test: Database => Unit): Unit = {
  val db = createTestDb()
  try test(db)
  finally db.close()
}

"createUser" should "persist to db" in withDatabase { db =>
  val user = userService.create("alice", db)
  user.id should not be None
}
```

## Step 7 - Tagged tests

```scala
import org.scalatest.Tag

object Slow extends Tag("Slow")
object Integration extends Tag("Integration")

class TaggedSpec extends AnyFlatSpec {
  "fast operation" should "work" in {
    // runs by default
  }

  "slow operation" should "work" taggedAs Slow in {
    // skipped unless -n Slow flag
  }
}
```

Selective run: `sbt 'testOnly * -- -n Slow'` or
`-l Slow` to exclude Slow.

## Step 8 - CI integration

```yaml
- run: sbt clean coverage test coverageReport
```

Coverage via `sbt-scoverage` plugin (Scala-native; not JaCoCo).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix specification styles in one project | Reader confusion | Pick one (Step 2) |
| `assert(x == y)` instead of Matchers DSL | Loses diff in failure | Use `x should equal(y)` (Step 3) |
| Sync test bodies for async code | Future never resolves; test passes wrongly | Use AsyncFlatSpec (Step 4) |
| Skip ScalaCheck for invariants | Misses edge cases that fixed-input tests don't catch | Use `forAll` (Step 5) |

## Limitations

- Multiple styles is a feature with a flip side: bikeshedding +
  style mixing.
- For Java/Kotlin teams, JUnit 5 / Kotest are more idiomatic.
- Coverage tool (sbt-scoverage) is Scala-only; cross-language
  projects need JaCoCo separately.

## References

- [st][st] - ScalaTest landing
- [st-styles][st-styles] - selecting a style
- [st-matchers][st-matchers] - Matchers reference
- scalacheck.org - ScalaCheck (property-based)
- `junit5-tests`,
  `kotest-tests`,
  `spock-tests`,
  `testng-tests` - sister tools
- `quickcheck-testing` - Haskell + Scala property-based
- `test-code-conventions`
