---
name: selenium-testing
description: "Authors Selenium WebDriver tests in any of its 6+ supported languages (Java, Python, JavaScript, C#, Ruby, Kotlin, PHP) - picks the appropriate language binding, configures WebDriver per browser, uses `By.*` locators with the team's accessibility-first preference where supported, runs locally + via Selenium Grid for distributed execution, parses results to JUnit XML. Use for legacy Selenium-locked stacks; new projects pick Playwright or Cypress."
rating: 22
d6: 3
---

# selenium-testing

## Overview

Selenium WebDriver is the long-standing W3C-standard browser
automation protocol. It predates Playwright and Cypress and has
the broadest language support: Java, Python, JavaScript, C#,
Ruby, Kotlin, PHP - all official.

Selenium 4 (2021) introduced relative locators and a more
modern API; Selenium 4 IDE replaces the old Selenium IDE for
record-and-playback.

## When to use

- The team has substantial existing Selenium investment; migration
  cost is prohibitive.
- The codebase is in a language with limited modern E2E support
  (e.g., older C# / Ruby / PHP projects).
- W3C standard adherence is contractually required.
- Cross-browser including IE11 is required (rare; deprecated).

For new projects in 2026+: pick Playwright or Cypress unless
constraints dictate Selenium.

## Step 1 - Install (Java + JUnit example)

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.seleniumhq.selenium</groupId>
  <artifactId>selenium-java</artifactId>
  <version>4.27.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>io.github.bonigarcia</groupId>
  <artifactId>webdrivermanager</artifactId>
  <version>5.9.2</version>
  <scope>test</scope>
</dependency>
```

WebDriverManager handles browser-driver download (saves the
"download chromedriver.exe" step).

## Step 2 - Author a test (Java)

```java
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import io.github.bonigarcia.wdm.WebDriverManager;

import java.time.Duration;

class CheckoutTest {

    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeAll
    static void setupClass() {
        WebDriverManager.chromedriver().setup();
    }

    @BeforeEach
    void setup() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void teardown() {
        driver.quit();
    }

    @Test
    void completeCheckout() {
        driver.get("http://localhost:3000/login");

        driver.findElement(By.cssSelector("[data-testid=email]"))
              .sendKeys("user@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]"))
              .sendKeys("test-password");
        driver.findElement(By.cssSelector("button[type=submit]")).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//h1[contains(text(), 'Welcome')]")));

        driver.get("http://localhost:3000/products/BOOK-001");
        driver.findElement(By.cssSelector("[data-testid=add-to-cart]")).click();

        WebElement cartCount = driver.findElement(By.cssSelector("[data-testid=cart-count]"));
        Assertions.assertEquals("1", cartCount.getText());
    }
}
```

## Step 3 - Locator strategies

| Strategy             | When                                         |
|----------------------|----------------------------------------------|
| `By.id`               | Element has stable `id`                       |
| `By.name`             | Form field with `name` attribute              |
| `By.cssSelector`      | Most cases (preferred over XPath)             |
| `By.xpath`            | Complex relationship queries (avoid otherwise) |
| `By.linkText`         | Anchor by text                                 |
| `By.partialLinkText`  | Anchor by partial text                          |
| `By.tagName`          | Generic (e.g., all `input` elements)           |
| `By.className`        | Single CSS class (brittle)                      |

Per the team's [`e2e-selector-quality-critic`](../../qa-test-review/agents/e2e-selector-quality-critic.md)
convention: prefer `data-testid` selectors; avoid XPath / classes.

For accessibility-first equivalents (Selenium doesn't ship
`getByRole` natively), evaluate **selenium-axe-core** for a11y
testing and consider Selenium 4's relative locators:

```java
// Selenium 4 relative locators
import static org.openqa.selenium.support.locators.RelativeLocator.*;

driver.findElement(with(By.tagName("button")).near(By.id("password-field")));
```

## Step 4 - Explicit waits

```java
// WebDriverWait with ExpectedConditions
WebElement element = wait.until(
    ExpectedConditions.elementToBeClickable(By.cssSelector("button.submit"))
);
element.click();
```

**Never use `Thread.sleep()`** - `WebDriverWait` polls until the
condition is met. Sleep is the most common Selenium flake source.

## Step 5 - Selenium Grid for distributed execution

```yaml
# docker-compose.grid.yml
services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports: ["4444:4444"]

  chrome-node:
    image: selenium/node-chrome:4.27.0
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

  firefox-node:
    image: selenium/node-firefox:4.27.0
    # ... same env
```

Connect from tests:

```java
WebDriver driver = new RemoteWebDriver(
    new URL("http://localhost:4444"),
    new ChromeOptions()
);
```

Grid distributes tests across nodes - handles parallelism. For
managed grids, see commercial: BrowserStack, Sauce Labs,
LambdaTest (covered by [`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md)).

## Step 6 - Other languages

### Python (pytest)

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_checkout():
    driver = webdriver.Chrome()
    driver.get('http://localhost:3000/login')

    driver.find_element(By.CSS_SELECTOR, '[data-testid=email]').send_keys('user@example.com')
    driver.find_element(By.CSS_SELECTOR, '[data-testid=password]').send_keys('pwd')
    driver.find_element(By.CSS_SELECTOR, 'button[type=submit]').click()

    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Welcome')]"))
    )

    driver.quit()
```

### C# (xUnit)

```csharp
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using Xunit;

public class CheckoutTest : IDisposable
{
    private readonly IWebDriver driver = new ChromeDriver();
    private readonly WebDriverWait wait;

    public CheckoutTest()
    {
        wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void CompleteCheckout()
    {
        driver.Navigate().GoToUrl("http://localhost:3000/login");
        driver.FindElement(By.CssSelector("[data-testid=email]")).SendKeys("user@example.com");
        // ...
    }

    public void Dispose() => driver.Quit();
}
```

## Step 7 - CI integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21' }
      - run: mvn test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: surefire-reports
          path: target/surefire-reports/
```

JUnit XML lands at `target/surefire-reports/`; feeds
[`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `Thread.sleep()` for synchronization                                  | Most common Selenium flake source.                                        | `WebDriverWait` + `ExpectedConditions` (Step 4). |
| XPath as default locator                                              | Slow + brittle.                                                           | CSS selectors first (Step 3). |
| Single test class with one giant flow                                 | Failure mid-test obscures cause.                                         | Per-flow tests with `@BeforeEach` setup. |
| Skipping `driver.quit()`                                              | Browser instance leaks; CI runner OOM.                                  | Always `quit()` in `@AfterEach` (Step 2). |
| Hardcoded ChromeDriver path                                           | Drift; brittle to Chrome updates.                                        | WebDriverManager (Step 1). |

## Limitations

- **Slower than Playwright / Cypress.** WebDriver protocol overhead;
  per-action HTTP round-trips.
- **Async / Promise handling weaker.** Per-language; some
  frameworks better than others.
- **No native mobile.** Mobile via Appium (uses Selenium WebDriver
  protocol underneath) per [`appium-testing`](../../qa-mobile-native/skills/appium-testing/SKILL.md).
- **Per-language idioms vary.** A Python pytest test looks
  different from a Java JUnit test.

## References

- Selenium project at `selenium.dev`.
- W3C WebDriver spec.
- [`playwright-testing`](../playwright-testing/SKILL.md),
  [`cypress-testing`](../cypress-testing/SKILL.md) - modern
  alternatives.
- [`selenium-grid-orchestrator`](../../agents/selenium-grid-orchestrator.md) - manages distributed Selenium runs.
- [`appium-testing`](../../qa-mobile-native/skills/appium-testing/SKILL.md) - mobile via WebDriver protocol.
