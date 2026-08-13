# TestNG - legacy JVM testing (reference)

Companion reference for `jvm-unit-tests`. Consult when maintaining a legacy
TestNG codebase, a Selenium-tradition project (TestNG is common in that
ecosystem), or the rare legitimate test-method-dependency case. For new
code, prefer JUnit 5 (SKILL.md).

Per [testng.org][tn-docs], TestNG (~2004) was the original
JUnit-improvement project. Its distinguishing features - method
dependencies (`dependsOnMethods` / `dependsOnGroups`), test groups, suite
XML config, `@DataProvider` parametrization - have mostly been adopted by
JUnit 5 since.

[tn-docs]: https://testng.org/

## Install

Gradle: `testImplementation("org.testng:testng:7.10.2")` + `tasks.test { useTestNG() }`.
Maven: `org.testng:testng:7.10.2` with test scope.

## Worked example - @Test + @DataProvider

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

**TestNG's `assertEquals` signature is `(actual, expected)` - reversed from
JUnit.** Reversed arguments produce misleading failure diagnostics; this is
the top migration bug source. A `@DataProvider` can live in a separate
class via `dataProviderClass = TestData.class`.

## Lifecycle annotations

Per [tn-docs][tn-docs]: `@BeforeSuite` / `@AfterSuite`, `@BeforeClass` /
`@AfterClass`, `@BeforeMethod` / `@AfterMethod`, `@BeforeGroups` /
`@AfterGroups`.

## Priorities and dependencies

```java
@Test(priority = 1)
public void firstTest() { ... }

@Test(dependsOnMethods = "createUser")
public void updateUser() { /* only runs if createUser passed */ }
```

**Dependencies are a smell in unit tests** (each should be independent);
legitimate for stage-gated integration suites (create → modify → delete).
Use sparingly - one failure cascades down the chain.

## Groups and selective runs

```java
@Test(groups = "fast")
public void fastTest1() { ... }

@Test(groups = {"slow", "integration"})
public void slowIntegration() { ... }
```

Run selectively: `mvn test -Dgroups=fast` or via a suite XML.

## testng.xml suites

```xml
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
</suite>
```

Run via `mvn test -Dsurefire.suiteXmlFiles=testng.xml`. Suite XML adds
complexity - most grouping can be done with annotations; document suite
intent if you keep the XML.

## Listeners

```java
public class CustomListener implements ITestListener {
    @Override
    public void onTestFailure(ITestResult result) {
        // capture screenshot, log context, etc.
    }
}
```

Apply per-class with `@Listeners(CustomListener.class)`.

## CI

`./gradlew test` (with `useTestNG()`) or
`mvn test -Dsurefire.suiteXmlFiles=testng.xml`. JaCoCo coverage works
identically to JUnit setups.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `assertEquals(expected, actual)` (JUnit order) | TestNG order is reversed; misleading diffs | `assertEquals(actual, expected)`, or AssertJ ([assertj.md](assertj.md)) |
| Heavy `dependsOnMethods` chains | Order coupling; cascade failures | Independent tests + setup methods |
| Mixing TestNG + JUnit in one project | Two runners | Pick one |

## References

- [tn-docs][tn-docs] - TestNG documentation
