---
name: selenium-testing
description: "Use when a project is already on Selenium WebDriver and needs tests written, fixed or upgraded in Java, Python, C# or other bindings: Selenium Manager drivers, locators, explicit waits, page objects, BiDi console errors, Grid in Docker, JUnit XML. New projects usually pick Playwright."
---

# selenium-testing

## Overview

Selenium WebDriver is a W3C-standard browser automation protocol with
the broadest language support: Java, Python, JavaScript, C#, Ruby,
Kotlin, PHP. Since 4.6 the bindings ship Selenium Manager, so a test
no longer downloads or configures a browser driver itself
([selenium-manager][sm]).

[sm]: https://www.selenium.dev/documentation/selenium_manager/

## When to use

- The team has substantial existing Selenium investment; migration
  cost is prohibitive.
- The codebase is in a language with limited modern E2E support
  (e.g., older C# / Ruby / PHP projects).
- W3C standard adherence is contractually required.
- Cross-browser including IE11 is required (rare; deprecated).

For new projects in 2026+: pick Playwright or Cypress unless
constraints dictate Selenium.

## How to use

1. Pick the language binding that matches the stack (Java, Python, C#, Ruby, Kotlin, PHP) and add the Selenium dependency. Selenium Manager resolves drivers; drop WebDriverManager and hardcoded driver paths.
2. Instantiate a driver in setup and `quit()` it in teardown so no browser process leaks.
3. Prefer stable `By.cssSelector` / `data-testid` locators; keep XPath for relationship queries only.
4. Replace every `Thread.sleep()` with `WebDriverWait` + `ExpectedConditions` so the test waits on a condition, not a clock. Never mix implicit and explicit waits.
5. Author one test per user flow with fresh per-test setup, and move page knowledge into page objects that never assert.
6. Save a screenshot on failure and fail on JavaScript errors captured over WebDriver BiDi.
7. For breadth, point a `RemoteWebDriver` at Selenium Grid (or a managed grid) to fan out across browsers.
8. Emit JUnit XML in CI (`target/surefire-reports/`) and feed it to `junit-xml-analysis`.

## Step 1 - Install (Java + JUnit example)

```xml
<!-- pom.xml: versions current on Maven Central, 3 Nov 2026 -->
<dependency>
  <groupId>org.seleniumhq.selenium</groupId>
  <artifactId>selenium-java</artifactId>
  <version>4.52.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>6.1.3</version>
  <scope>test</scope>
</dependency>
```

No driver dependency is needed. Per [selenium-manager][sm], Selenium
Manager ships "out of the box with each Selenium release as of version
4.6", the bindings use it by default "so you do not need to download it
or add anything to your code", and if Chrome is not installed "the
current stable Chrome for Testing (CfT) release will be discovered,
downloaded, and cached" under `~/.cache/selenium`. Cache that folder in
CI to skip the download on every run.

Upgrading an older suite: delete the `webdrivermanager` dependency,
every `WebDriverManager.chromedriver().setup()` call and every
`webdriver.chrome.driver` system property. They now fight Selenium
Manager instead of helping.

## Step 2 - Author a test (Java)

```java
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class CheckoutTest {

    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setup() {
        driver = new ChromeDriver(); // Selenium Manager finds the driver
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
              .sendKeys(System.getenv("TEST_USER_PASSWORD"));
        driver.findElement(By.cssSelector("button[type=submit]")).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//h1[contains(text(), 'Welcome')]")));

        driver.get("http://localhost:3000/products/BOOK-001");
        driver.findElement(By.cssSelector("[data-testid=add-to-cart]")).click();

        // Wait for the count to update instead of reading it immediately
        wait.until(ExpectedConditions.textToBe(
            By.cssSelector("[data-testid=cart-count]"), "1"));
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

Prefer `data-testid` selectors; avoid XPath / classes.

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

A lambda works when no `ExpectedConditions` helper fits, and
`FluentWait` tunes polling and ignored exceptions. Both forms are from
[selenium-waits][waits]:

```java
wait.until(d -> d.findElement(By.id("status")).getText().equals("Paid"));

Wait<WebDriver> fluent = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(10))
    .pollingEvery(Duration.ofMillis(300))
    .ignoring(ElementNotInteractableException.class);
fluent.until(d -> { d.findElement(By.id("pay")).click(); return true; });
```

Per [selenium-waits][waits]: "Do not mix implicit and explicit waits."
An implicit wait of 10 seconds plus an explicit wait of 15 seconds can
time out after 20. Pick explicit waits and leave `implicitlyWait` unset.

[waits]: https://www.selenium.dev/documentation/webdriver/waits/

## Step 5 - Page objects, failure screenshots and JavaScript errors

**Page objects.** Per [selenium-pom][pom], "A page object is an
object-oriented class that serves as an interface to a page of your
AUT", and "Page objects themselves should never make verifications or
assertions." The test asserts; the page object only acts and reads:

```java
public class LoginPage {
    private final WebDriver driver;
    private final By email = By.cssSelector("[data-testid=email]");
    private final By password = By.cssSelector("[data-testid=password]");
    private final By submit = By.cssSelector("button[type=submit]");

    public LoginPage(WebDriver driver) { this.driver = driver; }

    public DashboardPage loginAs(String user, String pass) {
        driver.findElement(email).sendKeys(user);
        driver.findElement(password).sendKeys(pass);
        driver.findElement(submit).click();
        return new DashboardPage(driver);
    }
}
```

**Screenshot on failure.** The capture call from
[selenium-windows][win] is
`((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE)`. Call it
from a JUnit `TestWatcher` (`testFailed`) or from the `@AfterEach`
before `quit()`, write it under `target/screenshots/`, and upload that
folder as a CI artifact.

**JavaScript errors over BiDi.** Per [selenium-bidi][bidi], WebDriver
BiDi is "the W3C standard bidirectional protocol for browser
automation" and the "cross-browser replacement for the Chrome DevTools
Protocol". Enable it with the `webSocketUrl` capability, then collect
page errors with the handler from [selenium-bidi-logging][bidilog]:

```java
ChromeOptions options = new ChromeOptions();
options.setCapability("webSocketUrl", true);
driver = new ChromeDriver(options);

List<JavascriptLogEntry> jsErrors = new CopyOnWriteArrayList<>();
((RemoteWebDriver) driver).script().addJavaScriptErrorHandler(jsErrors::add);

// ... drive the flow ...

Assertions.assertTrue(jsErrors.isEmpty(),
    () -> "Page threw: " + jsErrors.get(0).getText());
```

`addConsoleMessageHandler` works the same way for `console.*` output.

[pom]: https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/
[win]: https://www.selenium.dev/documentation/webdriver/interactions/windows/
[bidi]: https://www.selenium.dev/documentation/webdriver/bidi/
[bidilog]: https://www.selenium.dev/documentation/webdriver/bidi/logging/

## Step 6 - Selenium Grid for distributed execution

```yaml
# docker-compose.grid.yml
services:
  selenium-hub:
    image: selenium/hub:4.51.0-20261010
    ports: ["4444:4444"]

  chrome-node:
    image: selenium/node-chrome:4.51.0-20261010
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

  firefox-node:
    image: selenium/node-firefox:4.51.0-20261010
    # ... same env
```

Connect from tests:

```java
WebDriver driver = new RemoteWebDriver(
    new URL("http://localhost:4444"),
    new ChromeOptions()
);
```

Per the [docker-selenium README][dsel]: "Always use a Docker image with
a full tag to pin a specific browser and Grid version." The
`4.51.0-20261010` tag above was the newest Grid image on 3 Nov 2026;
Grid images trail the client release, and a 4.52 client talks to a 4.51
Grid over the same W3C protocol.

[dsel]: https://github.com/SeleniumHQ/docker-selenium

Grid distributes tests across nodes - handles parallelism. For
managed grids, see commercial: BrowserStack, Sauce Labs,
LambdaTest.

Verify: `curl http://localhost:4444/wd/hub/status` reports `"ready": true`
before pointing `RemoteWebDriver` at the grid; if not, the hub or nodes
haven't registered - check `docker compose -f docker-compose.grid.yml ps`
and the node container logs.

## Step 7 - Other language bindings

The Java spine above ports 1:1 to Selenium's other official bindings.
Python (pytest) and C# (xUnit) worked examples:
[references/language-bindings.md](references/language-bindings.md).

## Step 8 - CI integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with: { distribution: temurin, java-version: '21', cache: maven }
      - uses: actions/cache@v6
        with:
          path: ~/.cache/selenium   # Selenium Manager drivers + browsers
          key: selenium-${{ runner.os }}
      - run: mvn test
        env:
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: surefire-reports
          path: |
            target/surefire-reports/
            target/screenshots/
```

JUnit XML lands at `target/surefire-reports/`; feeds
`junit-xml-analysis` (in the qa-test-reporting plugin).

Verify: confirm `target/surefire-reports/*.xml` exists after `mvn test`
before handing off to `junit-xml-analysis`; if the directory is empty the
run emitted no reports - check that tests compiled and actually ran rather
than being skipped.

## Worked example

A legacy Java suite has one `CheckoutTest` method that drives login,
add-to-cart, and checkout in a single flow, synchronizing with
`Thread.sleep(2000)` between steps and never calling `driver.quit()`.
Browser processes leak on CI and the test flakes when the runner is
slow.

1. The single method is split into per-behavior `@Test` methods, each
   with `@BeforeEach` creating a fresh `ChromeDriver` and `@AfterEach`
   calling `driver.quit()`.
2. Every `Thread.sleep(2000)` is replaced with
   `wait.until(ExpectedConditions.elementToBeClickable(...))` so the
   step blocks only until the element is ready.
3. Class-name selectors move to `By.cssSelector("[data-testid=...]")`,
   and the hardcoded chromedriver path and the `webdrivermanager`
   dependency are deleted: Selenium Manager resolves the driver.
4. A Dockerized Selenium Grid is added and tests connect via
   `RemoteWebDriver`, so Chrome and Firefox run on parallel nodes.
5. `mvn test` writes JUnit XML to `target/surefire-reports/`, which
   `junit-xml-analysis` ingests for the flake trend.

Result: browsers no longer leak (every test quits its driver), the
fixed sleeps are gone, and the flow runs across two browsers on the
grid.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Single test class with one giant flow                                 | Failure mid-test obscures cause.                                         | Per-flow tests with `@BeforeEach` setup. |
| Skipping `driver.quit()`                                              | Browser instance leaks; CI runner OOM.                                  | Always `quit()` in `@AfterEach` (Step 2). |
| Hardcoded ChromeDriver path or a pinned WebDriverManager               | Drift; brittle to Chrome updates; duplicates what Selenium Manager does. | Delete both; Selenium Manager (Step 1). |
| `implicitlyWait` set alongside `WebDriverWait`                         | Timeouts stack unpredictably (10s + 15s can wait 20s).                   | Explicit waits only (Step 4). |
| Assertions inside page objects                                        | Page objects stop being reusable; failures point at the wrong layer.     | Assert in the test (Step 5). |
| Floating `selenium/node-chrome:latest` images                         | Browser and Grid change under the suite between runs.                    | Full date tag (Step 6). |

## Limitations

- **Slower than Playwright / Cypress.** WebDriver protocol overhead;
  per-action HTTP round-trips.
- **Async / Promise handling weaker.** Per-language; some
  frameworks better than others.
- **No native mobile.** Mobile via Appium (uses Selenium WebDriver
  protocol underneath) per `appium-testing` (in the qa-mobile plugin).
- **Per-language idioms vary.** A Python pytest test looks
  different from a Java JUnit test.

## References

- [sm][sm] - Selenium Manager: bundled since 4.6, browser download,
  `~/.cache/selenium`.
- [waits][waits] - explicit waits, lambdas, `FluentWait`, no mixing with
  implicit waits.
- [pom][pom] - page object model; no assertions in page objects.
- [win][win] - `TakesScreenshot` capture.
- [bidi][bidi], [bidilog][bidilog] - WebDriver BiDi, `webSocketUrl`,
  `addJavaScriptErrorHandler` and `addConsoleMessageHandler`.
- [dsel][dsel] - docker-selenium: hub and node images, full-tag pinning,
  status endpoint.
- Versions: `selenium-java` 4.52.0 and `junit-jupiter` 6.1.3 from Maven
  Central, Grid image tag from the docker-selenium repository tags, all
  checked 3 Nov 2026.
- `playwright-testing`,
  `cypress-testing` - modern
  alternatives.
- `appium-testing` - mobile via WebDriver protocol.
