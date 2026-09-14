# The e2e job was green on the release that broke paying for nine hours

## Problem Description

Release 4.11 went out on 2026-09-05 at 08:40. The Place Order button was wired to
a click handler that had been renamed the week before, so every checkout attempt
in production died in the browser: press the button, nothing happens, no error,
no order. We noticed at 17:20 when a customer emailed. Nine hours, no revenue.

We have had a browser check for exactly that button since March. It lives in
`CheckoutJourney.java`. The e2e job on the release commit was green. So was every
commit in July and August; I went back through all of them and there is not a red
one.

Here is the part I actually cannot explain. Petra rebuilt 4.11 on her laptop
yesterday, with the broken handler still in it, and ran the whole suite against
it. Green. Five tests, no failures, forty seconds. She did it three times. So
this is not a CI environment thing and it is not a race — the check we have been
paying for since March sits there and says the purchase worked while the purchase
demonstrably does not work.

Marcus on my team has a theory and I would like it confirmed or killed first,
because if he is right the rest of this is easy: he says Maven only ever runs
classes whose names end in `Test`, and `CheckoutJourney` is not one of those, so
it has never actually executed. He is fairly sure about it. The Maven output from
the release build, the contents of the reports artifact, and the commit history
for the test sources are all attached, along with the DOM Petra captured from the
broken 4.11 build right after pressing Place order.

I need three things out of this. Why the job reported success. How long it has
been reporting success without meaning anything. And the same job going red the
next time somebody breaks that button. Rewriting what we already have is fine —
I do not need a new suite, I need the one we have to count.

## Output Specification

1. Edit the test sources in place so that a Place Order button that does nothing
   turns this job red. Do not delete, disable or skip a test.
2. Write `docs/e2e-gate-postmortem.md` covering: why the job reported success,
   Marcus's theory confirmed or killed with the evidence you used, the date from
   which this check stopped meaning anything, and what to look at on the next run
   to confirm the fix took.
3. In that document, name the specific assertion in your rewritten test that goes
   red against the attached DOM capture, and say what it reads that the current
   one does not.
4. Leave `SmokeTest.java` and `LoginJourney.java` alone. They are fine.

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
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
        <configuration>
          <includes>
            <include>**/*Test.java</include>
            <include>**/*Journey.java</include>
          </includes>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/test/java/com/shop/e2e/CheckoutJourney.java ===============
package com.shop.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class CheckoutJourney {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

    @BeforeEach
    void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1440,900");
        driver = new ChromeDriver(options);
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

        WebElement status = driver.findElement(By.cssSelector("[data-testid=order-status]"));
        Assertions.assertFalse(status.getText().contains("We could not take your payment"));
        Assertions.assertEquals(0, driver.findElements(By.cssSelector(".checkout-error")).size());
    }
}

=============== FILE: src/test/java/com/shop/e2e/LoginJourney.java ===============
package com.shop.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class LoginJourney {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

    @BeforeEach
    void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1440,900");
        driver = new ChromeDriver(options);
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
        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=login-error]")));
        Assertions.assertTrue(error.getText().contains("do not match"));
    }

    @Test
    void signsInAKnownCustomer() {
        driver.get(BASE + "/login");
        driver.findElement(By.cssSelector("[data-testid=email]")).sendKeys("buyer@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]")).sendKeys("test-password");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=account-menu]")));
        Assertions.assertTrue(driver.getCurrentUrl().endsWith("/account"));
    }
}

=============== FILE: src/test/java/com/shop/e2e/SmokeTest.java ===============
package com.shop.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class SmokeTest {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

    @BeforeEach
    void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1440,900");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void teardown() {
        driver.quit();
    }

    @Test
    void storefrontLoads() {
        driver.get(BASE + "/");
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=hero]")));
        Assertions.assertTrue(driver.getTitle().contains("Shop"));
    }

    @Test
    void checkoutPageRendersWithASeededCart() {
        // ?cart=seeded drops two lines in the cart without replaying the journey
        driver.get(BASE + "/checkout?cart=seeded");
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=place-order]")));
        Assertions.assertEquals("2",
                driver.findElement(By.cssSelector("[data-testid=cart-count]")).getText());
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
      - name: run the suite
        run: mvn -B test -DbaseUrl=http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
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
[INFO] --- maven-compiler-plugin:3.13.0:testCompile (default-testCompile) @ shop-e2e ---
[INFO] Compiling 3 source files with javac [debug release 21]
[INFO]
[INFO] --- maven-surefire-plugin:3.5.2:test (default-test) @ shop-e2e ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO]
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.shop.e2e.CheckoutJourney
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 21.447 s -- in com.shop.e2e.CheckoutJourney
[INFO] Running com.shop.e2e.LoginJourney
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 9.882 s -- in com.shop.e2e.LoginJourney
[INFO] Running com.shop.e2e.SmokeTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 8.130 s -- in com.shop.e2e.SmokeTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  58.204 s
[INFO] Finished at: 2026-09-05T08:31:14Z
[INFO] ------------------------------------------------------------------------

=============== FILE: ci-logs/artifact-listing.txt ===============
$ unzip -l surefire-reports.zip
Archive:  surefire-reports.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     2211  2026-09-05 08:31   TEST-com.shop.e2e.CheckoutJourney.xml
      704  2026-09-05 08:31   com.shop.e2e.CheckoutJourney.txt
     2684  2026-09-05 08:31   TEST-com.shop.e2e.LoginJourney.xml
      812  2026-09-05 08:31   com.shop.e2e.LoginJourney.txt
     2590  2026-09-05 08:31   TEST-com.shop.e2e.SmokeTest.xml
      798  2026-09-05 08:31   com.shop.e2e.SmokeTest.txt
---------                     -------
     9799                     6 files

=============== FILE: ci-logs/petra-local-rerun.txt ===============
Petra, 2026-09-11. Checked out the 4.11.0 tag, applied nothing, built the app
from the same commit that shipped, ran the suite against it three times.

$ mvn -B test -DbaseUrl=http://localhost:3000
...
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  42.118 s

Then I opened the same build by hand and pressed Place order myself. The button
depresses and then nothing happens at all — the page does not move, the address
bar still says /checkout, no network request goes out, nothing appears on screen.
Same build the suite just called green. Captured the DOM at that moment, it is in
checkout-dom-4.11.html.

=============== FILE: ci-logs/checkout-dom-4.11.html ===============
<!-- /checkout on the 4.11 build, captured immediately after pressing Place order.
     Address bar still reads /checkout. -->
<main data-testid="checkout">
  <h1>Checkout</h1>
  <input data-testid="address-line-1" value="14 Mill Lane">
  <input data-testid="postcode" value="BS1 4DJ">
  <p class="totals">Total <span data-testid="order-total">44.91</span></p>
  <button data-testid="place-order" class="btn primary">Place order</button>
  <div data-testid="order-status" class="status-strip" aria-live="polite"></div>
</main>

=============== FILE: app/templates/checkout.html.tmpl ===============
{{!-- rendered server side for every request to /checkout --}}
<main data-testid="checkout">
  <h1>Checkout</h1>
  <input data-testid="address-line-1" name="address1">
  <input data-testid="postcode" name="postcode">
  <p class="totals">Total <span data-testid="order-total">{{total}}</span></p>
  <button data-testid="place-order" class="btn primary">Place order</button>

  {{!-- the strip is always in the document; the client writes into it when the
        order call comes back, success or failure --}}
  <div data-testid="order-status" class="status-strip" aria-live="polite"></div>

  {{#if paymentError}}
  <div class="alert alert--payment" data-testid="checkout-error" role="alert">
    {{paymentError}}
  </div>
  {{/if}}
</main>

{{!-- on success the client replaces the document with /orders/<id> --}}

=============== FILE: ci-logs/test-source-history.txt ===============
$ git log --date=short --pretty='%h %ad %an  %s' -- src/test/java

7c31f88 2026-08-14 p.novak   add the postcode field to the checkout journey
de40c1b 2026-05-19 r.okafor  quieten the checkout journey, see #4412
c04a5b1 2026-04-28 p.novak   promo assertion now checks the discounted total
a91c2f3 2026-04-02 t.keller  rename e2e classes so they read as journeys, not tests
5bb03de 2026-03-11 p.novak   cover the place order button
2fe80c1 2026-02-02 t.keller  first e2e pass: smoke + login

$ git show --stat --oneline de40c1b
de40c1b quieten the checkout journey, see #4412
 src/test/java/com/shop/e2e/CheckoutJourney.java | 5 ++---
 1 file changed, 2 insertions(+), 3 deletions(-)

$ git show --stat --oneline a91c2f3
a91c2f3 rename e2e classes so they read as journeys, not tests
 src/test/java/com/shop/e2e/CheckoutTest.java => src/test/java/com/shop/e2e/CheckoutJourney.java | 2 +-
 src/test/java/com/shop/e2e/LoginTest.java    => src/test/java/com/shop/e2e/LoginJourney.java    | 2 +-
 pom.xml                                                                                         | 8 +++++++-
 3 files changed, 9 insertions(+), 3 deletions(-)
