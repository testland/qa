---
name: testng-tests
description: "Configures and runs TestNG - JVM testing framework with `@Test` priorities + groups + `dependsOnMethods`; `@DataProvider` for parametrized tests with method-level data sources; `testng.xml` suite definitions for grouping + parallelism config; listeners (`ITestListener`, `ISuiteListener`) for hooks; `ITestContext` for cross-test state; integrates with Maven Surefire / Gradle. Use when working with legacy TestNG codebases or needing TestNG-specific features (test method dependencies, suite-level XML config)."
rating: 22
d6: 4
---

# testng-tests

## Overview

Per [testng.org][tn-docs]:

[tn-docs]: https://testng.org/

TestNG (Test Next Generation) was the original JUnit-improvement
project (~2004). Distinguishing features at the time:

- **Test method dependencies** (`dependsOnMethods` / `dependsOnGroups`)
- **Test groups** (logical grouping for selective runs)
- **Suite XML configuration** (define test combinations declaratively)
- **DataProviders** (method-source parametrization)

JUnit 5 has since adopted most of these via `@ParameterizedTest`,
`@MethodSource`, `@Nested`, and `@Disabled`. New projects mostly
default to JUnit 5; TestNG persists for legacy maintenance + teams
preferring its specific patterns.

## When to use

- Maintaining legacy TestNG codebase.
- Test-method dependency requirements (rare; usually a smell, but
  legitimate for stage-gated integration tests).
- Selenium-tradition projects (TestNG is common in Selenium
  ecosystem).

For new code, prefer [`junit5-tests`](../junit5-tests/SKILL.md).

## Step 1 - Install

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

## Step 2 - First test

```java
import org.testng.annotations.Test;
import static org.testng.Assert.assertEquals;

public class CalculatorTest {
    @Test
    public void addsTwoNumbers() {
        assertEquals(Calculator.add(1, 2), 3);
    }
}
```

Note: TestNG's assertEquals signature is `(actual, expected)`,
**reversed** from JUnit. Easy source of bugs when migrating.

## Step 3 - Annotations + lifecycle

Per [tn-docs][tn-docs]:

```java
public class TestLifecycle {
    @BeforeSuite  void beforeSuite()  { /* once before suite */ }
    @AfterSuite   void afterSuite()   { /* once after suite */ }
    @BeforeClass  void beforeClass()  { /* once before class */ }
    @AfterClass   void afterClass()   { /* once after class */ }
    @BeforeMethod void beforeMethod() { /* before each test */ }
    @AfterMethod  void afterMethod()  { /* after each test */ }
    @BeforeGroups void beforeGroups() { /* before tests in named group */ }
    @AfterGroups  void afterGroups()  { /* after tests in named group */ }

    @Test
    public void test1() { ... }
}
```

## Step 4 - Priorities + dependencies

```java
public class OrderedTests {
    @Test(priority = 1)
    public void firstTest() { ... }

    @Test(priority = 2)
    public void secondTest() { ... }

    @Test
    public void independentTest() { ... }
}

public class DependentTests {
    @Test
    public void createUser() { ... }

    @Test(dependsOnMethods = "createUser")
    public void updateUser() {
        // only runs if createUser passed
    }

    @Test(dependsOnMethods = "updateUser")
    public void deleteUser() { ... }
}
```

**Dependencies are a smell** in unit tests (each unit test should
be independent). Legitimate for stage-gated integration suites
(e.g., "create resource → modify → delete"). Use sparingly.

## Step 5 - Groups + selective runs

```java
@Test(groups = "fast")
public void fastTest1() { ... }

@Test(groups = {"slow", "integration"})
public void slowIntegration() { ... }

@Test(groups = "fast", dependsOnGroups = "init")
public void afterInit() { ... }
```

Run selectively:

```bash
mvn test -Dgroups=fast
# Or via testng.xml suite
```

## Step 6 - DataProvider

```java
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
```

DataProvider methods can also be in a separate class:

```java
@Test(dataProvider = "addCases", dataProviderClass = TestData.class)
public void testAdd(int a, int b, int expected) { ... }
```

## Step 7 - testng.xml suite definitions

```xml
<!-- testng.xml -->
<suite name="MySuite" parallel="methods" thread-count="4">
    <test name="FastTests">
        <groups>
            <run>
                <include name="fast"/>
                <exclude name="integration"/>
            </run>
        </groups>
        <classes>
            <class name="com.example.CalculatorTest"/>
        </classes>
    </test>

    <test name="IntegrationTests">
        <groups>
            <run><include name="integration"/></run>
        </groups>
        <packages>
            <package name="com.example.integration"/>
        </packages>
    </test>
</suite>
```

Run via `mvn test -Dsurefire.suiteXmlFiles=testng.xml`.

## Step 8 - Listeners (cross-test hooks)

```java
public class CustomListener implements ITestListener {
    @Override
    public void onTestStart(ITestResult result) { ... }

    @Override
    public void onTestFailure(ITestResult result) {
        // capture screenshot, log additional context, etc.
    }
}
```

Apply per-class:

```java
@Listeners(CustomListener.class)
public class MyTest { ... }
```

## Step 9 - CI integration

```yaml
- run: ./gradlew test
# Or with TestNG XML config:
- run: mvn test -Dsurefire.suiteXmlFiles=testng.xml
```

JaCoCo coverage works identically to JUnit setups.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `assertEquals(expected, actual)` (JUnit order) | TestNG order is reversed; failure messages misleading | Use `assertEquals(actual, expected)` (Step 2) |
| Heavy `dependsOnMethods` chains | Test order coupling; one failure cascades | Independent tests + setUp methods |
| Skip groups + run all tests in CI | Long CI cycle; slow tests block fast | Use groups + selective runs (Step 5) |
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
- testng.org - landing
- [`junit5-tests`](../junit5-tests/SKILL.md),
  [`kotest-tests`](../kotest-tests/SKILL.md),
  [`spock-tests`](../spock-tests/SKILL.md),
  [`scalatest`](../scalatest/SKILL.md) - sister tools
- [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md)
