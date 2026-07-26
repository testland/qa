---
name: junit5-tests
description: "Configures and runs JUnit 5 (Jupiter) - modern JVM testing platform with annotations (`@Test` / `@ParameterizedTest` / `@RepeatedTest` / `@TestFactory`), lifecycle hooks (`@BeforeAll` / `@BeforeEach` / `@AfterEach` / `@AfterAll`), extension model (`@ExtendWith`), display names (`@DisplayName`), conditional execution (`@EnabledOnOs`, `@EnabledIf`), parallel execution config; integrates with Maven Surefire / Gradle test task / IntelliJ. Use when the user works with Java / Kotlin codebases needing the modern JVM standard."
---

# junit5-tests

## Overview

Per [junit.org/junit5/docs/current/user-guide][j5-ug]:

[j5-ug]: https://junit.org/junit5/docs/current/user-guide/

Three components (released 2017, replacing JUnit 4):

- **JUnit Jupiter** - the new programming + extension model
- **JUnit Vintage** - backward-compat for JUnit 3/4 tests
- **JUnit Platform** - runner foundation (used by Jupiter, other test
  frameworks)

This skill targets JUnit Jupiter (the modern API). For Kotlin-native
tests with similar power but DSL-style, see `kotest-tests`.

## How to use

1. Add the `junit-jupiter` dependency and enable `useJUnitPlatform()` (Step 1).
2. Write a `@Test` method with an `assertEquals` assertion; run `mvn test` / `./gradlew test` (Step 2).
3. Add lifecycle hooks (`@BeforeEach` / `@AfterEach`) for shared setup and teardown (Step 3).
4. Collapse repeated cases into a `@ParameterizedTest` with a source provider (Step 4).
5. Pull in collaborators via `@ExtendWith` (e.g. `MockitoExtension`) and annotate display names + conditions (Steps 5-6).
6. Enable parallel execution in `junit-platform.properties` once tests are independent (Step 7).
7. Wire JaCoCo coverage and CI reporting (Step 8).

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

Per [j5-ug][j5-ug]:

```java
class UserServiceTest {
    @BeforeAll
    static void initAll() { /* once before all */ }

    @AfterAll
    static void tearDownAll() { /* once after all */ }

    @BeforeEach
    void init() { /* before each test */ }

    @AfterEach
    void tearDown() { /* after each test */ }

    @Test
    void test1() { ... }

    @Test
    void test2() { ... }
}
```

## Step 4 - Parameterized tests

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

class ParametrizedTest {
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 5, 8})
    void numbersInFibonacci(int n) {
        assertTrue(isFibonacci(n));
    }

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
        return Stream.of(
            Arguments.of(1, 2, 3),
            Arguments.of(0, 0, 0)
        );
    }
}
```

Source providers: `@ValueSource`, `@CsvSource`, `@CsvFileSource`,
`@MethodSource`, `@EnumSource`, `@ArgumentsSource`.

## Step 5 - Extensions (`@ExtendWith`)

JUnit 5's extension model (replaces JUnit 4's `@Rule` /
`@RunWith`):

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

Common extensions: `MockitoExtension`, `SpringExtension` (Spring),
`SystemStubsExtension` (env vars / system properties),
`TempDirectory`.

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

Enable in `junit-platform.properties`:

```properties
junit.jupiter.execution.parallel.enabled = true
junit.jupiter.execution.parallel.mode.default = concurrent
junit.jupiter.execution.parallel.config.strategy = dynamic
```

Per-test override:

```java
@Execution(ExecutionMode.SAME_THREAD)
class TestNotParallelizable { ... }
```

## Step 8 - Coverage and CI

Wire JaCoCo coverage (Maven / Gradle) and CI reporting (GitHub Actions + Codecov; Surefire emits JUnit XML for `junit-xml-analysis` in the qa-test-reporting plugin) per [references/coverage-and-ci.md](references/coverage-and-ci.md).

## Worked example

Testing `Calculator.add` across many inputs:

1. Add `org.junit.jupiter:junit-jupiter:5.11.0` (test scope) and enable `useJUnitPlatform()`.
2. Replace three near-identical `@Test` methods with one `@ParameterizedTest` + `@CsvSource({"1, 2, 3", "0, 0, 0", "-1, 1, 0"})` taking `(int a, int b, int expected)`.
3. Assert `assertEquals(expected, Calculator.add(a, b))` - each row reports as its own test.
4. Run `./gradlew test`: three cases execute; the `-1, 1, 0` row fails, isolating the sign bug while the others stay green.
5. Add `jacocoTestReport` (Step 8) to confirm the `add` branch is now covered.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix JUnit 4 + JUnit 5 in same project | Two runners, confusing | Pick Jupiter; use Vintage only for migration |
| `@Test` from `org.junit.Test` (JUnit 4) | Doesn't run with Jupiter runner | Import `org.junit.jupiter.api.Test` (Step 2) |
| Skip parallel-execution config | Slow test suite at scale | Enable `parallel.enabled` (Step 7) |
| Use `@Disabled` without ticket reference | Forgotten disabled tests | Always include reason + JIRA link (Step 6) |
| Generic `assertTrue(x.equals(y))` | Loses diff in failure | `assertEquals(x, y)` |

## Limitations

- JUnit 5 requires Java 8+ minimum.
- Migration from JUnit 4 isn't 100% automatic; rule replacement
  via extensions is non-trivial.
- Parallel execution requires test independence; shared mutable
  state breaks it.

## References

- [j5-ug][j5-ug] - official user guide
- junit.org/junit5 - landing
- maven.apache.org/surefire - Maven Surefire (test runner)
- jacoco.org - coverage tool
- [references/coverage-and-ci.md](references/coverage-and-ci.md) - JaCoCo config + CI reporting
- `kotest-tests`,
  `spock-tests`,
  `testng-tests`,
  `scalatest` - sister tools
- `test-code-conventions` - test code hygiene
