---
name: spock-tests
description: "Configures and runs Spock — Groovy-based JVM testing framework with given/when/then BDD blocks, where: data tables for parametrized tests, built-in mocking via Mock()/Stub()/Spy(), interaction-based testing (verify method calls in declarative DSL), implicit assertions in then: blocks. Use when working with Java/Kotlin codebases that benefit from Groovy DSL expressiveness, or maintaining existing Spock projects."
rating: 22
d6: 4
archetype: S1
---

# spock-tests

## Overview

Per [spockframework.org/spock/docs][sp-docs]:

[sp-docs]: https://spockframework.org/spock/docs/

Spock is a Groovy-based JVM test framework. Distinguishing properties:

- **given/when/then BDD blocks** with implicit semantic structure
- **where: data tables** for parametrized tests with the cleanest
  syntax in any JVM framework
- **Built-in mocking** (no Mockito needed): `Mock()`, `Stub()`, `Spy()`
- **Interaction-based testing**: verify method-call sequences in
  the then: block declaratively

For Kotlin-only projects, [`kotest-tests`](../kotest-tests/SKILL.md)
covers similar BDD territory natively. Spock's Groovy syntax is the
strongest argument; modern JVM projects often prefer Kotlin DSLs.

## Step 1 — Install

`build.gradle.kts`:

```kotlin
plugins {
    id("groovy")   // Groovy plugin needed for Spock
}

dependencies {
    testImplementation("org.spockframework:spock-core:2.4-M5-groovy-4.0")
    testImplementation(platform("org.junit:junit-bom:5.11.0"))
    testImplementation("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()   // Spock 2 runs on JUnit Platform
}
```

Test files: `src/test/groovy/**/*Spec.groovy`.

## Step 2 — First test

Per [sp-docs][sp-docs] structure:

```groovy
import spock.lang.Specification

class CalculatorSpec extends Specification {
    def "adds two numbers"() {
        given:
        def calc = new Calculator()

        when:
        def result = calc.add(1, 2)

        then:
        result == 3
    }
}
```

The `then:` block contains assertions. Each statement is implicitly
a boolean assertion — failure shows the full expression value, not
just true/false.

## Step 3 — given/when/then blocks

Per [sp-docs][sp-docs]:

| Block | Purpose |
|---|---|
| `setup:` / `given:` | Test fixture setup |
| `when:` | Action being tested |
| `then:` | Assertions on the action's effect |
| `expect:` | Combined when+then for simple cases |
| `where:` | Data table for parametrized tests |
| `cleanup:` | Per-test cleanup |
| `and:` | Subdivider for any block |

```groovy
def "user is created with default role"() {
    expect:
    new User("alice").role == "user"
}

def "registration validates email"() {
    given:
    def service = new RegistrationService()

    when:
    service.register(email)

    then:
    InvalidEmailException ex = thrown()
    ex.message == "Invalid email format"

    where:
    email << ["", "no-at-sign", "@no-domain", "spaces in@email.com"]
}
```

## Step 4 — Data tables (Spock-distinctive)

The where: data table is Spock's killer feature:

```groovy
def "addition cases"() {
    expect:
    Calculator.add(a, b) == result

    where:
    a   | b   || result
    1   | 2   || 3
    0   | 0   || 0
    -1  | 1   || 0
    100 | 200 || 300
}
```

Cleaner than JUnit 5's `@CsvSource` for visual inspection. Each row
runs as a separate test; failures don't stop subsequent rows.

## Step 5 — Built-in mocking

```groovy
def "user service calls repository"() {
    given:
    def repo = Mock(UserRepository)
    def service = new UserService(repo)

    when:
    service.create("alice@example.com")

    then:
    1 * repo.save(_)   // exactly 1 call to save() with any arg
}

def "service handles repo failure"() {
    given:
    def repo = Stub(UserRepository) {
        save(_) >> { throw new SQLException("connection lost") }
    }
    def service = new UserService(repo)

    when:
    service.create("alice@example.com")

    then:
    thrown(SQLException)
}

def "spy delegates but observes"() {
    given:
    def realRepo = new InMemoryRepository()
    def spy = Spy(realRepo)
    def service = new UserService(spy)

    when:
    service.create("alice@example.com")

    then:
    1 * spy.save(_) >> { call -> callRealMethod() }   // delegate to real impl
}
```

**Mock vs Stub vs Spy:**
- `Mock()` — verify-able interactions; throws on uninstructed calls
- `Stub()` — no verification; default-value response unless instructed
- `Spy()` — wraps real object; observe calls + optionally override

## Step 6 — Interaction cardinality

```groovy
then:
1 * service.method()           // exactly once
0 * service.method()           // never
(1..3) * service.method()      // 1 to 3 times
(_) * service.method()         // any number (default)
1 * service.method(_)          // any args
1 * service.method("alice", _) // partial matchers
1 * service.method() >> 42     // returns 42 when called
1 * service.method() >>> [1, 2, 3]   // returns 1 first call, 2 second, etc.
```

## Step 7 — Lifecycle hooks

```groovy
def setupSpec() { /* once before all tests in spec */ }
def cleanupSpec() { /* once after */ }
def setup() { /* before each test */ }
def cleanup() { /* after each test */ }
```

## Step 8 — CI integration

Same as JUnit (Spock runs on JUnit Platform):

```yaml
- run: ./gradlew test jacocoTestReport
- uses: codecov/codecov-action@v4
  with: { files: build/reports/jacoco/test/jacocoTestReport.xml }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use Mockito alongside Spock | Two mocking APIs in one suite | Use Spock's built-in (Step 5) |
| `expect:` for multi-step setup | Mixes given + when + then | Use given/when/then explicitly |
| Skip `1 *` cardinality, just `_ *` | Loses interaction-count check | Always specify (Step 6) |
| Use Spock for Java-only project | Groovy adds dependency + classpath weight | Use JUnit 5 (Java-native) |
| `Mock` when `Stub` suffices | Over-strict; tests fail on incidental calls | Stub for non-verified deps (Step 5) |

## Limitations

- Requires Groovy compiler in the build (extra build step + classpath
  weight).
- Pure-Java projects gain little vs JUnit 5; Kotlin teams benefit
  more from Kotest.
- Groovy syntax learning curve for non-Groovy teams.
- Spock 2 requires Java 8+ (Spock 1 is end-of-life).

## References

- [sp-docs][sp-docs] — Spock documentation
- spockframework.org — landing
- [`junit5-tests`](../junit5-tests/SKILL.md),
  [`kotest-tests`](../kotest-tests/SKILL.md),
  [`testng-tests`](../testng-tests/SKILL.md),
  [`scalatest`](../scalatest/SKILL.md) — sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
