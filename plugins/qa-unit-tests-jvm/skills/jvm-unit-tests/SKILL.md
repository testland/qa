---
name: jvm-unit-tests
description: "JVM unit testing (Java / Kotlin / Scala / Groovy) with JUnit 5 (Jupiter) as the primary framework - annotations (`@Test` / `@ParameterizedTest` / source providers), lifecycle hooks (`@BeforeAll` / `@BeforeEach`), extension model (`@ExtendWith` + Mockito/Spring), display names, conditional execution, parallel-execution config, JaCoCo coverage, and Maven Surefire / Gradle CI. Includes a per-language framework decision table (Java → JUnit 5, Kotlin → Kotest, Groovy → Spock, Scala → ScalaTest, legacy → TestNG; always match an existing build convention) and test-authoring conventions (framework detection from pom.xml / build.gradle / build.sbt, path conventions, no fabricated methods). References cover Kotest spec styles, Spock given/when/then + data tables, TestNG DataProviders + suites, ScalaTest styles + Matchers, and the AssertJ fluent-assertion catalog. Use for any JVM unit-test task: choosing or configuring a framework, writing or parameterizing tests, wiring coverage and CI."
---

# jvm-unit-tests

## Overview

Per [junit.org/junit5/docs/current/user-guide][j5-ug]:

[j5-ug]: https://junit.org/junit5/docs/current/user-guide/

JUnit 5 (released 2017, replacing JUnit 4) has three components:

- **JUnit Jupiter** - the modern programming + extension model
- **JUnit Vintage** - backward-compat for JUnit 3/4 tests
- **JUnit Platform** - runner foundation (also hosts Kotest, Spock 2)

This skill targets JUnit Jupiter as the JVM default, with the
language-specific alternatives as references. Lifecycle scope
(configure / run / parameterize / coverage / CI); test code hygiene is in
`test-code-conventions` (qa-test-review).

## Choosing a framework

1. **Match the existing convention first.** Grep the build file for
   dependency tokens: `junit-jupiter` → JUnit 5; `io.kotest:kotest-runner-junit5`
   → Kotest; `org.spockframework:spock-core` → Spock;
   `org.scalatest:scalatest` → ScalaTest; `org.testng:testng` → TestNG. If
   exactly one is present, match it - switching frameworks mid-build
   multiplies CI complexity for no quality gain.
2. **No convention yet** - decide by primary source language:

| Language | Framework | Why |
|---|---|---|
| **Java** (new project) | **JUnit 5** | The JVM standard; starter templates for Maven and Gradle ([j5-ug][j5-ug]) |
| **Kotlin** (Kotlin-only) | **Kotest** | Kotlin-idiomatic DSL, matchers, coroutines ([kotest.io](https://kotest.io/docs/)) → [references/kotest.md](references/kotest.md) |
| **Kotlin + Java modules** | **JUnit 5** | Cross-language support; one runner for both |
| **Groovy** | **Spock** | "a testing and specification framework for Java and Groovy applications" ([spockframework.org](https://spockframework.org/spock/docs/)) → [references/spock.md](references/spock.md) |
| **Scala** | **ScalaTest** | "the most flexible and most popular testing tool in the Scala ecosystem" ([scalatest.org](https://www.scalatest.org/)) → [references/scalatest.md](references/scalatest.md) |
| **Java (legacy TestNG codebase)** | **TestNG** | Match the existing convention; method dependencies + suite XML → [references/testng.md](references/testng.md) |

Language detection from the build file: `build.sbt` / `scalaVersion` →
Scala; `kotlin("jvm")` plugin / `kotlin-stdlib` → Kotlin; `id("groovy")`
with no Kotlin plugin → Groovy; otherwise Java. Do not pick Spock for a
Java-only project (it drags in the Groovy compiler) or ScalaTest for
Java/Kotlin.

For richer assertions on JUnit 5 / TestNG / Spock, pair with AssertJ →
[references/assertj.md](references/assertj.md).

## Step 1 - Install (Maven / Gradle)

Maven `pom.xml`:

```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
</dependency>
```

Gradle `build.gradle.kts`:

```kotlin
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.0")
}

tasks.test {
    useJUnitPlatform()
}
```

## Step 2 - First test

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {
    @Test
    void addsTwoNumbers() {
        assertEquals(3, Calculator.add(1, 2));
    }
}
```

Run: `mvn test` or `./gradlew test`.

## Step 3 - Lifecycle annotations

Per [j5-ug][j5-ug]: `@BeforeAll` / `@AfterAll` (static, once per class) and
`@BeforeEach` / `@AfterEach` (per test). JUnit 4's `@Before` / `@After` are
ignored by the Jupiter engine - a silent migration trap.

## Step 4 - Parameterized tests

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

class ParametrizedTest {
    @ParameterizedTest
    @CsvSource({
        "1, 2, 3",
        "0, 0, 0",
        "-1, 1, 0",
    })
    void addCases(int a, int b, int expected) {
        assertEquals(expected, Calculator.add(a, b));
    }

    @ParameterizedTest
    @MethodSource("addProvider")
    void addsViaMethodSource(int a, int b, int expected) {
        assertEquals(expected, Calculator.add(a, b));
    }

    static Stream<Arguments> addProvider() {
        return Stream.of(Arguments.of(1, 2, 3), Arguments.of(0, 0, 0));
    }
}
```

Source providers: `@ValueSource`, `@CsvSource`, `@CsvFileSource`,
`@MethodSource`, `@EnumSource`, `@ArgumentsSource`. Each row reports as its
own test.

## Step 5 - Extensions (`@ExtendWith`)

The extension model replaces JUnit 4's `@Rule` / `@RunWith`:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository repo;

    @InjectMocks
    private UserService service;

    @Test
    void createsUser() {
        when(repo.save(any())).thenReturn(new User(1, "Alice"));
        User u = service.create("Alice");
        assertEquals(1, u.getId());
    }
}
```

Common extensions: `MockitoExtension`, `SpringExtension`,
`SystemStubsExtension`, `TempDirectory`.

## Step 6 - Display names + conditional execution

```java
@DisplayName("User service")
class UserServiceTest {
    @Test
    @DisplayName("creates a user with email lowercased")
    void createsUserWithLowercaseEmail() { ... }

    @Test
    @EnabledOnOs(OS.LINUX)
    void linuxOnlyTest() { ... }

    @Test
    @EnabledIfEnvironmentVariable(named = "INTEGRATION", matches = "true")
    void integrationOnly() { ... }

    @Test
    @Disabled("Re-enable after fixing JIRA-1234")
    void temporarilyDisabled() { ... }
}
```

## Step 7 - Parallel execution

`junit-platform.properties`:

```properties
junit.jupiter.execution.parallel.enabled = true
junit.jupiter.execution.parallel.mode.default = concurrent
junit.jupiter.execution.parallel.config.strategy = dynamic
```

Per-class opt-out: `@Execution(ExecutionMode.SAME_THREAD)`. Parallel
execution requires test independence; shared mutable state breaks it.

## Step 8 - Coverage and CI

JaCoCo, Maven (`jacoco-maven-plugin` 0.8.12): bind `prepare-agent`, a
`report` execution in the `test` phase, and a `check` execution with a
`BUNDLE` / `LINE` / `COVEREDRATIO` minimum (e.g. `0.80`) to gate coverage.

Gradle + GitHub Actions:

```yaml
- run: ./gradlew test jacocoTestReport
- uses: codecov/codecov-action@v4
  with: { files: ./build/reports/jacoco/test/jacocoTestReport.xml }
```

Surefire (Maven) emits JUnit XML for `junit-xml-analysis`
(qa-test-reporting). Kotest and Spock 2 run on the JUnit Platform, so the
same `./gradlew test jacocoTestReport` CI shape applies; ScalaTest uses
`sbt clean coverage test coverageReport` (sbt-scoverage, not JaCoCo).

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect language + build tool.** `src/main/java|kotlin|scala|groovy` →
   language; `pom.xml` → Maven, `build.gradle[.kts]` → Gradle, `build.sbt`
   → sbt. Test sources go under `src/test/<language>/`
   ([docs.gradle.org/java_testing](https://docs.gradle.org/current/userguide/java_testing.html)).
2. **Detect the framework from the build file** (dependency tokens above).
   Two or more framework signals in one build → stop and ask which to use.
3. **Emit one test file at the conventional path**:
   `src/test/java/<package>/<Class>Test.java`,
   `src/test/kotlin/<package>/<Class>Test.kt`,
   `src/test/scala/<package>/<Class>Spec.scala`,
   `src/test/groovy/<package>/<Class>Spec.groovy`. One spec → one new test
   method; never modify existing tests, never fabricate target methods the
   spec did not state.
4. **Mind assertion argument order.** JUnit takes `(expected, actual)`;
   **TestNG flips it to `(actual, expected)`** - reversed arguments produce
   misleading diffs. When AssertJ is on the classpath, prefer
   `assertThat(actual).isEqualTo(expected)` - it sidesteps the order trap
   entirely ([references/assertj.md](references/assertj.md)).
5. **No smoke asserts** (`assertTrue(true)`, Kotest `1 shouldBe 1`, Spock
   `then: true`) when the spec names a concrete return value.
6. **Don't mix engines' APIs**: TestNG `@DataProvider` with JUnit 5
   `@ParameterizedTest` will not be discovered - one framework's
   parametrization API per file.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix JUnit 4 + JUnit 5 in the same project | Two runners, confusing | Jupiter; Vintage only for migration |
| `@Test` from `org.junit.Test` (JUnit 4) | Doesn't run under Jupiter | Import `org.junit.jupiter.api.Test` (Step 2) |
| JUnit 4 `@Before` / `@After` in a Jupiter project | Silently ignored | `@BeforeEach` / `@AfterEach` (Step 3) |
| Skip parallel-execution config | Slow suite at scale | Enable `parallel.enabled` (Step 7) |
| `@Disabled` without a ticket reference | Forgotten disabled tests | Reason + issue link (Step 6) |
| Generic `assertTrue(x.equals(y))` | Loses diff on failure | `assertEquals(x, y)` or AssertJ |
| New framework mid-build "for modernization" | Wholesale rewrite for no quality gain | Match convention; scope migration separately |

## Limitations

- JUnit 5 requires Java 8+ (current versions Java 17+ at runtime per
  [j5-ug][j5-ug]).
- Migration from JUnit 4 isn't fully automatic; rule → extension
  replacement is non-trivial.
- Parallel execution requires test independence.

## References

- [j5-ug][j5-ug] - official JUnit 5 user guide
- maven.apache.org/surefire - Maven Surefire (test runner)
- jacoco.org - coverage tool
- docs.gradle.org/current/userguide/java_testing.html - Gradle test layout
- [references/kotest.md](references/kotest.md) - Kotest spec styles,
  matchers, coroutines, isolation modes
- [references/spock.md](references/spock.md) - Spock given/when/then, data
  tables, built-in mocking
- [references/testng.md](references/testng.md) - TestNG DataProviders,
  groups, suites, listeners
- [references/scalatest.md](references/scalatest.md) - ScalaTest styles,
  Matchers DSL, ScalaCheck
- [references/assertj.md](references/assertj.md) - AssertJ fluent
  assertions
- `test-code-conventions` (qa-test-review) - test code hygiene
