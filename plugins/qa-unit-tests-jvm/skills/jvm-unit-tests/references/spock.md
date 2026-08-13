# Spock - Groovy BDD testing (reference)

Companion reference for `jvm-unit-tests`. Consult for Groovy projects or
existing Spock codebases. Pure-Java projects gain little vs JUnit 5 (Spock
requires the Groovy compiler in the build); Kotlin teams get more from
Kotest ([kotest.md](kotest.md)).

Per [spockframework.org/spock/docs][sp-docs]:

[sp-docs]: https://spockframework.org/spock/docs/

Spock's distinguishing features: given/when/then BDD blocks with implicit
assertions, `where:` data tables (the cleanest parametrization syntax on
the JVM), and built-in mocking (`Mock()` / `Stub()` / `Spy()` - no Mockito
needed) with declarative interaction verification.

## Install

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

## Blocks

Per [sp-docs][sp-docs]:

| Block | Purpose |
|---|---|
| `setup:` / `given:` | Test fixture setup |
| `when:` | Action being tested |
| `then:` | Assertions on the action's effect (each statement is implicitly a boolean assertion) |
| `expect:` | Combined when+then for simple cases |
| `where:` | Data table for parametrized tests |
| `cleanup:` | Per-test cleanup |
| `and:` | Subdivider for any block |

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

Failure output shows the full expression value, not just true/false.

## Data tables

```groovy
def "addition cases"() {
    expect:
    Calculator.add(a, b) == result

    where:
    a   | b   || result
    1   | 2   || 3
    0   | 0   || 0
    -1  | 1   || 0
}
```

Each row runs as a separate test; failures don't stop subsequent rows.
Exception cases pair `thrown()` with a piped input list:

```groovy
then:
InvalidEmailException ex = thrown()

where:
email << ["", "no-at-sign", "@no-domain"]
```

## Built-in mocking

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
    ...
    then:
    thrown(SQLException)
}
```

**Mock vs Stub vs Spy:** `Mock()` - verifiable interactions; `Stub()` - no
verification, default-value responses unless instructed; `Spy()` - wraps a
real object, observe + optionally override.

Interaction cardinality: `1 *` (exactly once), `0 *` (never),
`(1..3) *`, `1 * m(_)` (any args), `1 * m() >> 42` (stubbed return),
`1 * m() >>> [1, 2, 3]` (successive returns).

## Lifecycle hooks

`setupSpec()` / `cleanupSpec()` (once per spec) and `setup()` /
`cleanup()` (per test).

## CI

Spock 2 runs on the JUnit Platform - same shape as JUnit 5:
`./gradlew test jacocoTestReport`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mockito alongside Spock | Two mocking APIs in one suite | Spock's built-in mocking |
| `expect:` for multi-step setup | Mixes given + when + then | Explicit given/when/then |
| `_ *` cardinality everywhere | Loses interaction-count check | Specify `1 *` etc. |
| Spock for a Java-only project | Groovy adds classpath weight | JUnit 5 (SKILL.md) |
| `expect:` + `where:` with no condition expression on the line | Bare statements pass silently | Make the line an expression Groovy evaluates as the assertion |

## Limitations

- Requires the Groovy compiler in the build.
- Groovy syntax learning curve for non-Groovy teams.
- Spock 2 requires Java 8+ (Spock 1 is end-of-life).

## References

- [sp-docs][sp-docs] - Spock documentation
- spockframework.org - landing
