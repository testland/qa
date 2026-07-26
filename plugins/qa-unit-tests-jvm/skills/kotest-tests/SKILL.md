---
name: kotest-tests
description: "Configures and runs Kotest - Kotlin-native test framework with multiple specification styles (StringSpec, FunSpec, BehaviorSpec, DescribeSpec, ShouldSpec, FreeSpec, FeatureSpec, ExpectSpec, AnnotationSpec); rich matcher library; built-in property-based testing (alternative to jqwik); coroutines support; data-driven testing; isolation modes per-spec or per-test; integrates with Gradle JVM test task. Use when working with Kotlin and wanting Kotlin-idiomatic DSL over JUnit 5's annotation-driven approach. Matchers (shouldBe, shouldContain) are bundled with the runner and are not a drop-in replacement for a standalone JVM assertion library; for assertion-only use paired with JUnit 5 / TestNG / Spock see assertj."
---

# kotest-tests

## Overview

Per [kotest.io/docs][kt-docs]:

[kt-docs]: https://kotest.io/docs/

Kotest is the Kotlin-native test framework. Differentiated from
JUnit 5 (which works fine with Kotlin too) by:

- **Multiple specification styles** - DSL choice per team preference
- **Rich matchers** - `shouldBe`, `shouldContain`, `shouldThrow`, etc.
- **Built-in property-based testing** - alternative to `jqwik-testing`
- **Coroutines-first** - `runTest`/`runBlocking` integrated cleanly
- **Spec-level isolation modes** - per-test fresh instances vs single

For multi-language JVM projects, JUnit 5 is more universal. For
Kotlin-only or Kotlin-primary, Kotest's DSL is more ergonomic.

## How to use

1. Add `kotest-runner-junit5` + `kotest-assertions-core` (and `kotest-property` for PB) and enable `useJUnitPlatform()` (Step 1).
2. Pick one specification style (StringSpec / FunSpec / BehaviorSpec) and write the first test with a `shouldBe` matcher (Step 2).
3. Assert with the matcher library - equality, collections, exceptions ([references/matchers-and-isolation.md](references/matchers-and-isolation.md), Step 3).
4. Add `checkAll` property-based cases and `withData` data-driven rows where inputs vary (Steps 4, 6).
5. Write coroutine tests directly - test bodies are suspend functions (Step 5).
6. Set `isolationMode` when specs carry mutable state ([references/matchers-and-isolation.md](references/matchers-and-isolation.md), Step 7).
7. Run `./gradlew test jacocoTestReport` in CI - same runner + JaCoCo as JUnit 5 (Step 8).

## Step 1 - Install

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

## Step 2 - Specification styles

Per [kt-docs][kt-docs] Kotest supports 8+ styles. Common picks:

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
            shouldThrow<ArithmeticException> {
                Calculator.add(Int.MAX_VALUE, 1)
            }
        }
    }
})
```

**BehaviorSpec** (Given/When/Then BDD):

```kotlin
class UserServiceTest : BehaviorSpec({
    given("a registered user") {
        val user = User("alice@example.com")
        `when`("they update their email") {
            user.updateEmail("new@example.com")
            then("the email is updated") {
                user.email shouldBe "new@example.com"
            }
        }
    }
})
```

Pick one style per project + stick with it.

## Step 3 - Matchers

Assert with the rich matcher library - equality, null, string, collection, map, type, Kotlin `Result`, and `shouldThrow<E>`. Full catalog in [references/matchers-and-isolation.md](references/matchers-and-isolation.md).

## Step 4 - Property-based testing

Built-in (no separate library):

```kotlin
class PropertyTest : StringSpec({
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
})
```

For deeper property-based work see `jqwik-testing`
or the dedicated qa-property-based plugin.

## Step 5 - Coroutines

```kotlin
class AsyncTest : StringSpec({
    "fetches user data" {
        val user = fetchUserAsync(1)   // suspend function
        user.id shouldBe 1
    }
})
```

Test bodies are suspend functions; `runTest` etc. wrappers from
kotlinx-coroutines-test work directly.

## Step 6 - Data-driven testing

```kotlin
class DataDrivenTest : FunSpec({
    context("addition") {
        withData(
            Triple(1, 2, 3),
            Triple(0, 0, 0),
            Triple(-1, 1, 0),
        ) { (a, b, expected) ->
            (a + b) shouldBe expected
        }
    }
})
```

Each row reports as a separate test - failures don't stop subsequent
rows.

## Step 7 - Isolation modes

Four modes (default `SingleInstance`); set `isolationMode` per-spec or globally via `AbstractProjectConfig` when specs share mutable state. Mode table + example in [references/matchers-and-isolation.md](references/matchers-and-isolation.md).

## Step 8 - CI integration

Same as JUnit 5 (Kotest's runner is `kotest-runner-junit5`):

```yaml
- run: ./gradlew test jacocoTestReport
```

JaCoCo coverage works identically.

## Worked example

Testing `Calculator.add` with FunSpec + property-based checks:

1. Add `io.kotest:kotest-runner-junit5:5.9.1`, `kotest-assertions-core:5.9.1`, `kotest-property:5.9.1`; enable `useJUnitPlatform()`.
2. Write `class CalculatorTest : FunSpec({ ... })` with `test("adds two numbers") { Calculator.add(1, 2) shouldBe 3 }`.
3. Add a property case: `test("addition is commutative") { checkAll<Int, Int> { a, b -> a + b shouldBe b + a } }`.
4. Run `./gradlew test`: the example case passes; `checkAll` generates many pairs and reports the first counterexample if the invariant breaks.
5. `jacocoTestReport` confirms the `add` path is covered.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix multiple spec styles in one project | Reader confusion | Pick one (Step 2) |
| Default isolation + shared mutable state | Tests interfere | `InstancePerTest` mode (Step 7) |
| Use Kotest property-based + jqwik in same project | Two PB libraries | Pick one |
| `assertEquals(a, b)` (JUnit style) | Mixes paradigms | Use `a shouldBe b` (Step 3) |

## Limitations

- Spec-style choice is bikeshedding-prone; team alignment matters.
- Multi-language JVM projects benefit more from JUnit 5 (Java + Kotlin
  interop).
- Some matchers have subtle ordering quirks (`shouldContainExactly` vs
  `shouldContainAll`).

## References

- [kt-docs][kt-docs] - Kotest documentation
- kotest.io - landing
- [references/matchers-and-isolation.md](references/matchers-and-isolation.md) - matcher catalog + isolation modes
- `junit5-tests`,
  `spock-tests`,
  `testng-tests`,
  `scalatest` - sister tools
- `jqwik-testing` - JVM property-based
- `test-code-conventions`
