---
name: testng-tests
description: "Configures and runs TestNG - JVM testing framework with `@Test` priorities + groups + `dependsOnMethods`; `@DataProvider` for parametrized tests with method-level data sources; `testng.xml` suite definitions for grouping + parallelism config; listeners (`ITestListener`, `ISuiteListener`) for hooks; `ITestContext` for cross-test state; integrates with Maven Surefire / Gradle. Use when working with legacy TestNG codebases or needing TestNG-specific features (test method dependencies, suite-level XML config)."
---

# testng-tests

## Overview

Per [testng.org][tn-docs], TestNG (Test Next Generation) was the original
JUnit-improvement project (~2004). Distinguishing features at the time:

- **Test method dependencies** (`dependsOnMethods` / `dependsOnGroups`)
- **Test groups** (logical grouping for selective runs)
- **Suite XML configuration** (`testng.xml`, declarative test combinations)
- **DataProviders** (method-source parametrization)

[tn-docs]: https://testng.org/

JUnit 5 has since adopted most of these via `@ParameterizedTest`,
`@MethodSource`, `@Nested`, and `@Disabled`. New projects mostly default to
JUnit 5; TestNG persists for legacy maintenance and teams preferring its
specific patterns.

## When to use

- Maintaining a legacy TestNG codebase.
- Test-method dependency requirements (rare; usually a smell, but
  legitimate for stage-gated integration tests).
- Selenium-tradition projects (TestNG is common in the Selenium
  ecosystem).

For new code, prefer `junit5-tests`.

## How to use

1. Add the TestNG dependency and switch the build's test task to the TestNG
   runner (see Install).
2. Write a test class with `@Test` methods - keep TestNG's
   `assertEquals(actual, expected)` argument order in mind (reversed from
   JUnit).
3. Parametrize repeated cases with a `@DataProvider` (see Worked example).
4. Run the suite (`./gradlew test` or `mvn test`) and reproduce a single
   failure by method name.
5. For the full lifecycle-annotation set, `dependsOnMethods` chains, groups,
   `testng.xml` suites / parallelism, listeners, and CI wiring, see
   [references/annotations-suites-and-ci.md](references/annotations-suites-and-ci.md).

## Install

`build.gradle.kts`:

```kotlin
dependencies {
    testImplementation("org.testng:testng:7.10.2")
}

tasks.test {
    useTestNG()
}
```

Maven:

```xml
<dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <version>7.10.2</version>
    <scope>test</scope>
</dependency>
```

## Worked example

One TestNG test end to end - a plain `@Test` plus a `@DataProvider`-driven
parametrized test against the same `Calculator`.

```java
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;
import static org.testng.Assert.assertEquals;

public class CalculatorTest {
    @Test
    public void addsTwoNumbers() {
        assertEquals(Calculator.add(1, 2), 3);
    }

    @DataProvider(name = "addCases")
    public Object[][] addCases() {
        return new Object[][] {
            {1, 2, 3},
            {0, 0, 0},
            {-1, 1, 0},
        };
    }

    @Test(dataProvider = "addCases")
    public void testAdd(int a, int b, int expected) {
        assertEquals(Calculator.add(a, b), expected);
    }
}
```

Note: TestNG's `assertEquals` signature is `(actual, expected)`, **reversed**
from JUnit. Easy source of bugs when migrating.

Run the suite:

```bash
./gradlew test    # or: mvn test
```

A `@DataProvider` method can also live in a separate class:

```java
@Test(dataProvider = "addCases", dataProviderClass = TestData.class)
public void testAdd(int a, int b, int expected) { ... }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `assertEquals(expected, actual)` (JUnit order) | TestNG order is reversed; failure messages misleading | Use `assertEquals(actual, expected)` (Worked example) |
| Heavy `dependsOnMethods` chains | Test order coupling; one failure cascades | Independent tests + setUp methods |
| Skip groups + run all tests in CI | Long CI cycle; slow tests block fast | Use groups + selective runs (references) |
| Suite XML without team agreement | Hidden test grouping; confusing | Document suite intent or skip XML in favor of annotations |
| Mix TestNG + JUnit in same project | Two runners | Pick one |

## Limitations

- TestNG vs JUnit ecosystem split - fewer integrations, less
  StackOverflow coverage.
- assertEquals argument order is opposite of JUnit (migration
  source of bugs).
- testng.xml configuration adds complexity; same can usually be
  done with annotations.
- Less active development than JUnit 5.

## References

- [tn-docs][tn-docs] - TestNG documentation
- [references/annotations-suites-and-ci.md](references/annotations-suites-and-ci.md) -
  lifecycle annotations, dependencies, groups, `testng.xml` suites, listeners, CI.
- `junit5-tests`,
  `kotest-tests`,
  `spock-tests`,
  `scalatest` - sister tools
- `test-code-conventions`
