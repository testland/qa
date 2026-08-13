# ScalaTest - Scala-native testing (reference)

Companion reference for `jvm-unit-tests`. Consult for Scala projects
(Scala 2.13 or 3) or existing ScalaTest codebases. For Java/Kotlin
projects, JUnit 5 (SKILL.md) or Kotest ([kotest.md](kotest.md)) are more
idiomatic.

Per [scalatest.org][st]:

[st]: https://www.scalatest.org/

ScalaTest is the de facto Scala testing framework, with multiple
specification styles and a Matchers DSL; ScalaCheck is its canonical
property-based pairing.

## Install

`build.sbt`:

```scala
libraryDependencies += "org.scalatest" %% "scalatest" % "3.2.19" % Test
libraryDependencies += "org.scalatestplus" %% "scalacheck-1-17" % "3.2.18.0" % Test
```

Test files live under `src/test/scala/`.

## Specification styles

Per [scalatest.org/user_guide/selecting_a_style][st-styles] - pick one
style per project:

[st-styles]: https://www.scalatest.org/user_guide/selecting_a_style

**FlatSpec** (BDD-style, the recommended default):

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

**FunSuite** (xUnit-style): `test("add two numbers") { assert(Calculator.add(1, 2) == 3) }`.
**WordSpec** (deeply-nested BDD): `"A UserService" when { "creating a user" should { "set default role" in { … } } }`.

## Matchers DSL

Per [scalatest.org/user_guide/using_matchers][st-matchers]:

[st-matchers]: https://www.scalatest.org/user_guide/using_matchers

```scala
result should equal(42)
result shouldBe 42                        // strict equality (uses ==)
list should have size 5
list should contain("alice")
list should contain only("alice", "bob")
list should contain inOrder("alice", "bob")
map should contain key("alice")
string should startWith("hello")
string should fullyMatch regex("\\d+")
opt shouldBe defined
either shouldBe Right(42)
result should be > 10
result should be (within(1.0) of 42.0)    // float tolerance
```

## Async tests

`AsyncFlatSpec` test bodies return `Future[Assertion]` - ScalaTest handles
the async lifecycle:

```scala
class AsyncSpec extends AsyncFlatSpec with Matchers {
  "fetchUser" should "return user data" in {
    fetchUser(1) map { user => user.id shouldBe 1 }
  }
}
```

Sync test bodies for async code are a silent-pass trap - the Future never
resolves inside the assertion.

## ScalaCheck integration

```scala
import org.scalatestplus.scalacheck.ScalaCheckPropertyChecks
import org.scalacheck.Gen

class PropertyCheckSpec extends AnyFlatSpec with Matchers
                          with ScalaCheckPropertyChecks {
  "addition" should "be commutative" in {
    forAll { (a: Int, b: Int) => a + b shouldBe b + a }
  }
}
```

`forAll` shrinks to a minimal counterexample on failure
(scalacheck.org). For the property-based discipline see the
qa-property-based plugin.

## Lifecycle hooks and fixtures

`BeforeAndAfterAll` (`beforeAll` / `afterAll`) + `BeforeAndAfter`
(`before { … }` / `after { … }`), or the loan-fixture pattern:

```scala
def withDatabase(test: Database => Unit): Unit = {
  val db = createTestDb()
  try test(db)
  finally db.close()
}

"createUser" should "persist to db" in withDatabase { db => ... }
```

## Tagged tests

```scala
object Slow extends Tag("Slow")

"slow operation" should "work" taggedAs Slow in { ... }
```

Selective run: `sbt 'testOnly * -- -n Slow'` (include) / `-l Slow`
(exclude).

## CI

```yaml
- run: sbt clean coverage test coverageReport
```

Coverage via the `sbt-scoverage` plugin (Scala-native, not JaCoCo);
cross-language projects need JaCoCo separately for the Java/Kotlin side.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix specification styles in one project | Reader confusion | Pick one |
| `assert(x == y)` instead of Matchers DSL | Loses diff on failure | `x should equal(y)` |
| Sync test bodies for async code | Future never resolves; false pass | `AsyncFlatSpec` |

## References

- [st][st] - ScalaTest landing
- [st-styles][st-styles] - selecting a style
- [st-matchers][st-matchers] - Matchers DSL
- scalacheck.org - ScalaCheck (property-based)
