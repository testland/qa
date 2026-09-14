# The payment specs break every time the card vendor ships, and now six agents won't start a browser

## Problem Description

Our checkout embeds a hosted card-entry component from a payments vendor. It
renders into our own DOM — it is not in an iframe — and the vendor ships a new
build roughly monthly with no notice and no changelog we can subscribe to.

Our payment specs have broken four times since June: 2026-06-18, 2026-07-09,
2026-08-11 and 2026-09-03. Every one of those was within a few hours of a vendor
release, every one was a locator that stopped resolving, and every one cost
someone half a day. Nobody trusts the payment specs any more; on 2026-08-11 the
on-call engineer assumed it was the vendor again and it was actually us.

The constraint I cannot move: **that markup is not ours.** We cannot add
attributes to it, we do not build it, and the vendor's support desk has an
eleven-day median response. Whatever we do has to work against markup we do not
control.

Marina saved the rendered component from the build that was live in June and
from the one live now, both straight out of the browser. They are attached. I
would like the next vendor build to be a non-event.

Separate but urgent: the build agents took a Chrome update on 2026-09-08 and six
of the eleven now fail before a single test runs. The stack trace from
`build-agent-07` is attached. Right now the release is going out on five agents
and everything is queued behind them.

## Output Specification

1. Rewrite the locators in `PaymentPage.java` so that a vendor build of the kind
   visible between those two snapshots does not break them.
2. Fix whatever is stopping six agents from starting a browser, in the files
   provided.
3. Write `docs/vendor-widget-locators.md`: for each control on that component,
   the hook you chose and the evidence from the two snapshots that it is a
   durable one. Say plainly which controls have no durable hook of their own and
   what you did about them.
4. Leave `LoginTest.java` alone — it passes and it is not part of this.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.shop</groupId>
  <artifactId>shop-e2e</artifactId>
  <version>6.2.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
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
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/test/java/com/shop/pages/BasePage.java ===============
package com.shop.pages;

import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public abstract class BasePage {

    protected static WebDriver driver;
    protected static WebDriverWait wait;

    protected static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

    @BeforeEach
    void startBrowser() {
        System.setProperty("webdriver.chrome.driver", "C:\\selenium\\chromedriver_120.exe");
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1440,900");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void stopBrowser() {
        driver.quit();
    }
}

=============== FILE: src/test/java/com/shop/pages/PaymentPage.java ===============
package com.shop.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class PaymentPage extends BasePage {

    // vendor widget - class names come out of their build, update when they ship
    private static final By CARD_NUMBER = By.className("pw-input_7d31e4");
    private static final By EXPIRY = By.xpath("/html/body/div[3]/form/input[2]");
    private static final By CVC = By.xpath("/html/body/div[3]/form/input[3]");
    private static final By SAVE_CARD = By.className("pw-box_8812cd");
    private static final By PAY = By.className("pw-submit_0a91fe");
    private static final By ERROR = By.className("pw-error_19bb77");

    public void enterCard(String number, String expiry, String cvc) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(CARD_NUMBER)).sendKeys(number);
        driver.findElement(EXPIRY).sendKeys(expiry);
        driver.findElement(CVC).sendKeys(cvc);
    }

    public void saveCardForNextTime() {
        driver.findElement(SAVE_CARD).click();
    }

    public void pay() {
        wait.until(ExpectedConditions.elementToBeClickable(PAY)).click();
    }

    public String errorText() {
        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR));
        return error.getText();
    }
}

=============== FILE: src/test/java/com/shop/e2e/PaymentTest.java ===============
package com.shop.e2e;

import com.shop.pages.PaymentPage;
import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

class PaymentTest extends PaymentPage {

    @Test
    void paysWithAValidCard() {
        driver.get(BASE + "/checkout?cart=seeded");
        enterCard("4242424242424242", "12/29", "123");
        saveCardForNextTime();
        pay();
        wait.until(ExpectedConditions.urlContains("/orders/"));
        Assertions.assertTrue(
                driver.findElement(By.cssSelector("[data-testid=order-confirmation]"))
                      .getText().contains("Thank you"));
    }

    @Test
    void reportsADeclinedCard() {
        driver.get(BASE + "/checkout?cart=seeded");
        enterCard("4000000000000002", "12/29", "123");
        pay();
        Assertions.assertTrue(errorText().contains("declined"));
    }
}

=============== FILE: src/test/java/com/shop/e2e/LoginTest.java ===============
package com.shop.e2e;

import com.shop.pages.BasePage;
import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

class LoginTest extends BasePage {

    @Test
    void signsInAKnownCustomer() {
        driver.get(BASE + "/login");
        driver.findElement(By.cssSelector("[data-testid=email]")).sendKeys("buyer@example.com");
        driver.findElement(By.cssSelector("[data-testid=password]")).sendKeys("test-password");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=account-menu]")));
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
}

=============== FILE: fixtures/widget-2026-06-14.html ===============
<!-- saved 2026-06-14 from /checkout with
     document.querySelector('[class^=pw-root]').outerHTML
     at this point the component was the third div under <body> -->
<div class="pw-root_4f81ab" data-pw-build="2026.06.02">
  <form class="pw-form_9c2d10" novalidate>
    <label class="pw-label_22aa01">Card number</label>
    <input id="pw-card-7c10"
           name="cardnumber"
           class="pw-input_7d31e4"
           autocomplete="cc-number"
           inputmode="numeric"
           aria-label="Card number">

    <label class="pw-label_22aa01">Expiry</label>
    <input id="pw-exp-4d22"
           name="cc-exp"
           class="pw-input_7d31e4"
           inputmode="numeric"
           placeholder="MM/YY"
           aria-label="Expiry date">

    <label class="pw-label_22aa01">CVC</label>
    <input class="pw-input_7d31e4"
           maxlength="4"
           inputmode="numeric">

    <label class="pw-check_50ff9b">
      <input type="checkbox" class="pw-box_8812cd"> Save this card
    </label>

    <button type="submit" class="pw-submit_0a91fe">Pay now</button>
  </form>
  <p class="pw-error_19bb77" role="alert" hidden></p>
</div>

=============== FILE: fixtures/widget-2026-09-02.html ===============
<!-- saved 2026-09-02 from /checkout with
     document.querySelector('[class^=pw-root]').outerHTML
     the vendor added an outer wrapper in the July build; the component is now
     the fourth div under <body> and the form is one level deeper than it was -->
<div class="pw-root_e90c37" data-pw-build="2026.08.28">
  <div class="pw-frame_71ba20">
    <form class="pw-form_3ad6f1" novalidate>
      <label class="pw-label_c40e98">Card number</label>
      <input id="pw-card-b391"
             name="cardnumber"
             class="pw-input_b62f09"
             autocomplete="cc-number"
             inputmode="numeric"
             aria-label="Card number">

      <label class="pw-label_c40e98">Expiry</label>
      <input id="pw-exp-1f07"
             name="cc-exp"
             class="pw-input_b62f09"
             inputmode="numeric"
             placeholder="MM/YY"
             aria-label="Expiry date">

      <label class="pw-label_c40e98">CVC</label>
      <input class="pw-input_b62f09"
             pattern="[0-9]{3,4}"
             inputmode="numeric">

      <label class="pw-check_2de104">
        <input type="checkbox" class="pw-box_66c1af"> Save this card
      </label>

      <label class="pw-check_2de104">
        <input type="checkbox" class="pw-box_66c1af"> Email me a receipt
      </label>

      <button type="submit" class="pw-submit_d17b42">Pay now</button>
    </form>
  </div>
  <p class="pw-error_5f2a83" role="alert" hidden></p>
</div>

=============== FILE: ci-logs/agent-start-failure.txt ===============
[ERROR] PaymentTest.paysWithAValidCard -- Time elapsed: 1.204 s <<< ERROR!
org.openqa.selenium.SessionNotCreatedException:
Could not start a new session. Response code 500.
Message: session not created: This version of ChromeDriver only supports Chrome version 120
Current browser version is 141.0.7390.65 with binary path C:\Program Files\Google\Chrome\Application\chrome.exe
Host info: host: 'BUILD-AGENT-07', ip: '10.4.2.17'
Build info: version: '4.27.0', revision: 'b307b0d2b3'
System info: os.name: 'Windows 11', os.arch: 'amd64', java.version: '21.0.5'
Driver info: org.openqa.selenium.chrome.ChromeDriver

        at org.openqa.selenium.remote.RemoteWebDriver.<init>(RemoteWebDriver.java:184)
        at com.shop.pages.BasePage.startBrowser(BasePage.java:24)

Agents on Chrome 141: 07, 08, 09, 10, 11, 12  -> failing
Agents pinned to Chrome 120 by group policy: 01, 02, 03, 04, 05  -> passing
