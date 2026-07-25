# TestNG annotations, dependencies, suites, listeners, and CI

Deep reference for `testng-tests` SKILL.md. Consult when wiring the full
lifecycle-annotation set, test-method dependencies, group-based selective runs,
`testng.xml` suites with parallelism, listeners, or Maven / Gradle CI
integration.

## Lifecycle annotations

Per [tn-docs][tn-docs]:

[tn-docs]: https://testng.org/

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

## Priorities and dependencies

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
(e.g., "create resource, modify, delete"). Use sparingly.

## Groups and selective runs

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

## testng.xml suite definitions

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

## Listeners (cross-test hooks)

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

## CI integration

```yaml
- run: ./gradlew test
# Or with TestNG XML config:
- run: mvn test -Dsurefire.suiteXmlFiles=testng.xml
```

JaCoCo coverage works identically to JUnit setups.

## References

- [tn-docs][tn-docs] - TestNG documentation
