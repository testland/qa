---
name: jvm-unit-tests
description: "Use whenever the task is to write, add, fix or review JVM unit tests in Java, Kotlin, Scala or Groovy: JUnit 6 (Jupiter) by default and JUnit 5 upgrades, plus Kotest, Spock, ScalaTest and TestNG. Covers parameterized tests, lifecycle hooks, Mockito, AssertJ, JaCoCo coverage and Maven or Gradle CI."
---

# jvm-unit-tests

## Overview

Per [junit.org][junit], "JUnit 6 is the current generation of the JUnit
testing framework" (6.1.3 on Maven Central, 3 Nov 2026). Per the
[JUnit overview][j-overview], a release is "JUnit Platform + JUnit
Jupiter + JUnit Vintage":

[junit]: https://junit.org/
[j-overview]: https://docs.junit.org/6.1.3/overview.html
[j-notes]: https://docs.junit.org/6.1.3/release-notes.html
[j-build]: https://docs.junit.org/6.1.3/running-tests/build-support.html
[j5-ug]: https://docs.junit.org/6.1.3/writing-tests/intro.html

- **JUnit Jupiter** - the programming + extension model (`org.junit.jupiter.*`;
  the package names did not change from JUnit 5)
- **JUnit Vintage** - runs JUnit 3/4 tests; per the overview it is
  "deprecated and should only be used temporarily while migrating"
- **JUnit Platform** - runner foundation (also hosts Kotest, Spock 2)

This skill targets JUnit Jupiter as the JVM default, with the
language-specific alternatives as references. Lifecycle scope
(configure / run / parameterize / coverage / CI); test code hygiene is in
`test-code-conventions` (qa-test-review).

## Choosing a framework

1. **Match the existing convention first.** Grep the build file for
   dependency tokens: `junit-jupiter` → JUnit Jupiter (5.x or 6.x, check the version); `io.kotest:kotest-runner-junit5`
   → Kotest; `org.spockframework:spock-core` → Spock;
   `org.scalatest:scalatest` → ScalaTest; `org.testng:testng` → TestNG. If
   exactly one is present, match it - switching frameworks mid-build
   multiplies CI complexity for no quality gain.
2. **No convention yet** - decide by primary source language:

| Language | Framework | Why |
|---|---|---|
| **Java** (new project) | **JUnit 6** (Jupiter) | The JVM standard; starter templates for Maven and Gradle ([j5-ug][j5-ug]) |
| **Kotlin** (Kotlin-only) | **Kotest** | Kotlin-idiomatic DSL, matchers, coroutines ([kotest.io](https://kotest.io/docs/)) → [references/kotest.md](references/kotest.md) |
| **Kotlin + Java modules** | **JUnit 6** (Jupiter) | Cross-language support; one runner for both |
| **Groovy** | **Spock** | "a testing and specification framework for Java and Groovy applications" ([spockframework.org](https://spockframework.org/spock/docs/)) → [references/spock.md](references/spock.md) |
| **Scala** | **ScalaTest** | "the most flexible and most popular testing tool in the Scala ecosystem" ([scalatest.org](https://www.scalatest.org/)) → [references/scalatest.md](references/scalatest.md) |
| **Java (legacy TestNG codebase)** | **TestNG** | Match the existing convention; method dependencies + suite XML → [references/testng.md](references/testng.md) |

Language detection from the build file: `build.sbt` / `scalaVersion` →
Scala; `kotlin("jvm")` plugin / `kotlin-stdlib` → Kotlin; `id("groovy")`
with no Kotlin plugin → Groovy; otherwise Java. Do not pick Spock for a
Java-only project (it drags in the Groovy compiler) or ScalaTest for
Java/Kotlin.

For richer assertions on JUnit / TestNG / Spock, pair with AssertJ →
[references/assertj.md](references/assertj.md).

## Step 1 - Install (Maven / Gradle)

Import the BOM so Platform, Jupiter and Vintage stay on one version
(setup from [JUnit build support][j-build]). JUnit 6 needs Java 17 or
newer at runtime ([overview][j-overview]); on Java 8 or 11, stay on
JUnit 5.x until the JDK moves.

Maven `pom.xml`:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.junit</groupId>
      <artifactId>junit-bom</artifactId>
      <version>6.1.3</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
```

Per [build support][j-build]: "As of JUnit 6.0, the minimum required
version of Maven Surefire/Failsafe is 3.0.0." Pin
`maven-surefire-plugin` explicitly (3.6.1 is current); an old default
from a parent POM can skip every test without an error.

Gradle `build.gradle.kts`:

```kotlin
dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
```

### Upgrading from JUnit 5 to JUnit 6

Per the [6.0.0 release notes][j-notes] (September 30, 2025):

| Change in 6.0 | What to do |
|---|---|
| "Java 17 and Kotlin 2.1 baseline" | Raise the test JDK first (Gradle toolchain, `maven.compiler.release`, CI `java-version`). |
| "Single version number for Platform, Jupiter, and Vintage" | Replace separate `junit-platform-*` / `junit-jupiter-*` versions with the BOM above. |
| `junit-platform-runner` removed, plus "various deprecated behaviors and APIs" | Delete `@RunWith(JUnitPlatform.class)` suites; use `@Suite` from `junit-platform-suite`. Fix deprecation warnings on 5.x before the jump. |
| "Switch to FastCSV library for `@CsvSource` and `@CsvFileSource`" | Run every CSV-driven test after the upgrade; 6.0.1 added `commentCharacter` after a regression with `#` as the delimiter. |
| "Support for using Kotlin `suspend` functions as test methods" | Kotlin tests can drop the `runBlocking` wrapper. |
| Surefire/Failsafe 3.0.0 minimum | Pin the plugin version (above). |

Imports stay `org.junit.jupiter.api.*`, so most test code compiles
unchanged.

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

JaCoCo, Maven (`jacoco-maven-plugin` 0.8.16, current on Maven Central;
details in `jacoco-analysis`): bind `prepare-agent`, a
`report` execution in the `test` phase, and a `check` execution with a
`BUNDLE` / `LINE` / `COVEREDRATIO` minimum (e.g. `0.80`) to gate coverage.

Gradle + GitHub Actions:

```yaml
- run: ./gradlew test jacocoTestReport
- uses: codecov/codecov-action@v7
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
6. **Don't mix engines' APIs**: TestNG `@DataProvider` with JUnit
   `@ParameterizedTest` will not be discovered - one framework's
   parametrization API per file.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix JUnit 4 + Jupiter in the same project | Two runners, confusing; Vintage is deprecated | Jupiter; Vintage only for migration |
| Separate version numbers for `junit-jupiter` and `junit-platform-*` | Mismatched Platform and engine fail at discovery | One `junit-bom` import (Step 1) |
| Surefire older than 3.0.0 with JUnit 6 | Below the stated minimum; tests may not be found | Pin `maven-surefire-plugin` (Step 1) |
| `@Test` from `org.junit.Test` (JUnit 4) | Doesn't run under Jupiter | Import `org.junit.jupiter.api.Test` (Step 2) |
| JUnit 4 `@Before` / `@After` in a Jupiter project | Silently ignored | `@BeforeEach` / `@AfterEach` (Step 3) |
| Skip parallel-execution config | Slow suite at scale | Enable `parallel.enabled` (Step 7) |
| `@Disabled` without a ticket reference | Forgotten disabled tests | Reason + issue link (Step 6) |
| Generic `assertTrue(x.equals(y))` | Loses diff on failure | `assertEquals(x, y)` or AssertJ |
| New framework mid-build "for modernization" | Wholesale rewrite for no quality gain | Match convention; scope migration separately |

## Limitations

- JUnit 6 requires Java 17+ at runtime ([j-overview][j-overview]);
  JUnit 5.x is the line for Java 8 and 11 projects.
- Migration from JUnit 4 isn't fully automatic; rule → extension
  replacement is non-trivial.
- Parallel execution requires test independence.

## References

- [junit][junit] - JUnit 6 is the current generation; Java 17 and Kotlin 2.1
- [j-overview][j-overview] - Platform, Jupiter, Vintage; Java 17 runtime;
  Vintage deprecated
- [j-build][j-build] - `junit-bom`, Gradle launcher, Surefire 3.0.0 minimum
- [j-notes][j-notes] - 6.0.0 release notes: baseline, unified version,
  removed APIs, FastCSV, Kotlin `suspend` tests
- [j5-ug][j5-ug] - writing tests (Jupiter user guide)
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
