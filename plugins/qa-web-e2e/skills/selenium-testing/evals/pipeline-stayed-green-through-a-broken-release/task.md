# The e2e job was green on the release that broke paying for nine hours

## Problem Description

Release 4.11 went out on 2026-09-05 at 08:40. The Place Order button was wired
to a handler that had been renamed, so every checkout attempt in production died
in the browser. We noticed at 17:20 when a customer emailed. Nine hours, no
revenue.

We have had an end-to-end check for exactly that button since March. It lives in
`CheckoutFlow.java` and it is a real test — Petra ran it on her machine against
the 4.11 build and it goes red in four seconds, like it should.

The e2e job on that release commit was green. So was every commit before it in
July and August; I went back through all of them this morning and I cannot find
a red one.

Petra pulled the Maven output from the release build and the list of commits
that have touched the test sources. Both are attached. The artifact the job
uploads from the release build contains exactly one XML file, and it is not for
any of the tests I actually care about.

I need to know why this job reports success while checkout is broken, exactly
how long it has been reporting success without meaning it, and I need it to go
red the next time this happens. I am not interested in adding more tests right
now — I want the ones we already paid for to count.

## Output Specification

1. Edit the build and CI files in place so the next broken checkout turns this
   job red.
2. Do not delete, disable or skip either of the two suites that are not running
   today. If bringing them into the gate requires changing them, change them and
   say what you changed and why.
3. Write `docs/e2e-gate-postmortem.md`: why the job reported success, the exact
   window during which the gate was not gating anything and the change that
   started it, and what specifically to look at on the next run to confirm the
   fix took.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.shop</groupId>
  <artifactId>shop-e2e</artifactId>
  <version>4.11.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>4.27.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>io.github.bonigarcia</groupId>
      <artifactId>webdrivermanager</artifactId>
      <version>5.9.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/test/java/com/shop/e2e/SmokeTest.java ===============
package com.shop.e2e;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class SmokeTest {

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
    void storefrontLoads() {
        driver.get(System.getProperty("baseUrl", "http://localhost:3000"));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=hero]")));
        Assertions.assertTrue(driver.getTitle().contains("Shop"));
    }
}

=============== FILE: src/test/java/com/shop/e2e/CheckoutFlow.java ===============
package com.shop.e2e;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class CheckoutFlow {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

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
    void customerCanSignInBrowseAddToCartApplyPromoAndPay() {
        driver.get(BASE + "/login");
        driver.findElement(By.cssSelector("[data-testid=email]")).sendKeys("buyer@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]")).sendKeys("test-password");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=account-menu]")));

        driver.get(BASE + "/products/BOOK-001");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=add-to-cart]"))).click();
        Assertions.assertEquals("1",
                driver.findElement(By.cssSelector("[data-testid=cart-count]")).getText());

        driver.get(BASE + "/cart");
        driver.findElement(By.cssSelector("[data-testid=promo-code]")).sendKeys("SPRING10");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=apply-promo]"))).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector("[data-testid=order-total]"), "44.91"));

        driver.get(BASE + "/checkout");
        driver.findElement(By.cssSelector("[data-testid=address-line-1]")).sendKeys("14 Mill Lane");
        driver.findElement(By.cssSelector("[data-testid=postcode]")).sendKeys("BS1 4DJ");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=place-order]"))).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=order-confirmation]")));
        Assertions.assertTrue(driver.getCurrentUrl().contains("/orders/"));
    }
}

=============== FILE: src/test/java/com/shop/e2e/LoginJourney.java ===============
package com.shop.e2e;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class LoginJourney {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

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
    void rejectsAWrongPassword() {
        driver.get(BASE + "/login");
        driver.findElement(By.cssSelector("[data-testid=email]")).sendKeys("buyer@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]")).sendKeys("nope");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=login-error]")));
    }

    @Test
    void signsInAKnownCustomer() {
        driver.get(BASE + "/login");
        driver.findElement(By.cssSelector("[data-testid=email]")).sendKeys("buyer@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]")).sendKeys("test-password");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=account-menu]")));
    }
}

=============== FILE: .github/workflows/e2e.yml ===============
name: e2e

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: start the app
        run: docker compose up -d --wait
      # failure.ignore is here so the artifact step below still runs when a test fails
      - name: run the suite
        run: mvn -B test -Dmaven.test.failure.ignore=true -DbaseUrl=http://localhost:3000
      - uses: actions/upload-artifact@v4
        with:
          name: surefire-reports
          path: target/surefire-reports/

=============== FILE: ci-logs/release-4.11-build.txt ===============
[INFO] Scanning for projects...
[INFO]
[INFO] ------------------------< com.shop:shop-e2e >-------------------------
[INFO] Building shop-e2e 4.11.0
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- maven-resources-plugin:3.3.1:testResources (default-testResources) @ shop-e2e ---
[INFO] skip non existing resourceDirectory /home/runner/work/shop/shop/src/test/resources
[INFO]
[INFO] --- maven-compiler-plugin:3.13.0:testCompile (default-testCompile) @ shop-e2e ---
[INFO] Compiling 3 source files with javac [debug release 21]
[INFO]
[INFO] --- maven-surefire-plugin:3.5.2:test (default-test) @ shop-e2e ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO]
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.shop.e2e.SmokeTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 6.104 s -- in com.shop.e2e.SmokeTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  41.882 s
[INFO] Finished at: 2026-09-05T08:31:14Z
[INFO] ------------------------------------------------------------------------

=============== FILE: ci-logs/test-source-history.txt ===============
$ git log --oneline --date=short --pretty='%h %ad %an  %s' -- src/test/java

9d1e77c 2026-08-14 p.novak   add postcode field to the checkout flow
c04a5b1 2026-06-30 p.novak   promo code assertion now checks the discounted total
a91c2f3 2026-04-02 t.keller  rename e2e classes so they read as journeys, not tests
5bb03de 2026-03-11 p.novak   cover the place order button
2fe80c1 2026-02-02 t.keller  first e2e pass: smoke + login

$ git show --stat --oneline a91c2f3
a91c2f3 rename e2e classes so they read as journeys, not tests
 src/test/java/com/shop/e2e/CheckoutTest.java  => src/test/java/com/shop/e2e/CheckoutFlow.java  | 2 +-
 src/test/java/com/shop/e2e/LoginTest.java     => src/test/java/com/shop/e2e/LoginJourney.java  | 2 +-
 2 files changed, 2 insertions(+), 2 deletions(-)

=============== FILE: ci-logs/artifact-listing.txt ===============
$ unzip -l surefire-reports.zip
Archive:  surefire-reports.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1874  2026-09-05 08:31   TEST-com.shop.e2e.SmokeTest.xml
      612  2026-09-05 08:31   com.shop.e2e.SmokeTest.txt
---------                     -------
     2486                     2 files
