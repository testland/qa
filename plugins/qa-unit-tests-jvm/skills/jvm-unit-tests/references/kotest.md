# Kotest - Kotlin-native testing (reference)

Companion reference for `jvm-unit-tests`. Consult for Kotlin-only or
Kotlin-primary projects that want a Kotlin-idiomatic DSL over JUnit 5's
annotation-driven approach. For multi-language JVM projects, JUnit 5 is more
universal (SKILL.md).

Per [kotest.io/docs][kt-docs]:

[kt-docs]: https://kotest.io/docs/

Kotest differs from JUnit 5 by: multiple specification styles (DSL choice
per team), rich matchers (`shouldBe`, `shouldContain`, `shouldThrow`),
built-in property-based testing, coroutines-first test bodies, and
spec-level isolation modes. Matchers are bundled with the runner and are
not a drop-in standalone assertion library - for assertion-only use with
JUnit 5 / TestNG / Spock see [assertj.md](assertj.md).

## Install

`build.gradle.kts`:

```kotlin
dependencies {
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.kotest:kotest-assertions-core:5.9.1")
    testImplementation("io.kotest:kotest-property:5.9.1")   // for property-based
}

tasks.test {
    useJUnitPlatform()
}
```

## Specification styles

Per [kt-docs][kt-docs], 8+ styles. Common picks - one style per project:

**StringSpec** (terse, no nesting):

```kotlin
class CalculatorTest : StringSpec({
    "adds two numbers" {
        Calculator.add(1, 2) shouldBe 3
    }
    "throws on overflow" {
        shouldThrow<ArithmeticException> {
            Calculator.add(Int.MAX_VALUE, 1)
        }
    }
})
```

**FunSpec** (most familiar to JUnit / pytest users):

```kotlin
class CalculatorTest : FunSpec({
    test("adds two numbers") {
        Calculator.add(1, 2) shouldBe 3
    }
    context("overflow handling") {
        test("throws on max + 1") {
            shouldThrow<ArithmeticException> { Calculator.add(Int.MAX_VALUE, 1) }
        }
    }
})
```

**BehaviorSpec** (Given/When/Then BDD): `given("…") { \`when\`("…") {
then("…") { … } } }`.

## Matchers

Per [kotest.io/docs/assertions/matchers.html][kt-matchers]:

[kt-matchers]: https://kotest.io/docs/assertions/matchers.html

| Matcher | Use |
|---|---|
| `value shouldBe expected` / `shouldNotBe` | Equality |
| `value.shouldBeNull()` / `shouldNotBeNull()` | Null check |
| `string.shouldContain("substring")` / `shouldStartWith` / `shouldEndWith` | String |
| `string.shouldMatch(regex)` | Regex |
| `list.shouldHaveSize(3)` / `shouldContainExactly(...)` / `shouldContainAll(...)` | Collection |
| `map.shouldContainKey("key")` / `shouldContainValue("v")` | Map |
| `value.shouldBeInstanceOf<MyClass>()` | Type |
| `result.shouldBeSuccess()` / `shouldBeFailure()` | Kotlin Result |
| `shouldThrow<E> { ... }` | Exception |

## Property-based testing (built-in)

```kotlin
"addition is commutative" {
    checkAll<Int, Int> { a, b ->
        a + b shouldBe b + a
    }
}
"concatenation length" {
    checkAll(Arb.string(), Arb.string()) { a, b ->
        (a + b).length shouldBe a.length + b.length
    }
}
```

For deeper property-based work see the qa-property-based plugin
(`jqwik-testing` for the JVM). Don't run Kotest property-based and jqwik in
the same project - pick one.

## Coroutines and data-driven tests

Test bodies are suspend functions - `runTest` etc. from
kotlinx-coroutines-test work directly:

```kotlin
"fetches user data" {
    val user = fetchUserAsync(1)   // suspend function
    user.id shouldBe 1
}
```

Data-driven rows via `withData` - each row reports as a separate test:

```kotlin
context("addition") {
    withData(
        Triple(1, 2, 3),
        Triple(0, 0, 0),
        Triple(-1, 1, 0),
    ) { (a, b, expected) ->
        (a + b) shouldBe expected
    }
}
```

## Isolation modes

Per [kotest.io/docs/framework/isolation-mode.html][kt-iso]:

[kt-iso]: https://kotest.io/docs/framework/isolation-mode.html

| Mode | Behavior |
|---|---|
| `SingleInstance` | One spec instance for all tests (default; fastest) |
| `InstancePerTest` | Fresh spec instance per test (incl. nested contexts) |
| `InstancePerLeaf` | Fresh spec instance per leaf-test only |

Set per-spec (`isolationMode = IsolationMode.InstancePerTest` inside the
spec body) or globally via `AbstractProjectConfig`. Use a fresh-instance
mode whenever specs carry mutable state.

## CI

Kotest's runner is `kotest-runner-junit5`, so CI is identical to JUnit 5:
`./gradlew test jacocoTestReport`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix multiple spec styles in one project | Reader confusion | Pick one |
| Default isolation + shared mutable state | Tests interfere | `InstancePerTest` |
| `assertEquals(a, b)` (JUnit style) in Kotest specs | Mixes paradigms | `a shouldBe b` |

## References

- [kt-docs][kt-docs] - Kotest documentation
- [kt-matchers][kt-matchers] - matcher catalog
- [kt-iso][kt-iso] - isolation modes
