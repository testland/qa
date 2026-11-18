# The checkout test can't find the card field or the receipt tab

## Problem Description

Our Selenium checkout test can't find the card field, fails on the 3-D Secure step, and checks the wrong tab for the receipt (`CheckoutTest.java`, page structure in `docs/page-structure.md`). Fix it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/test/java/shop/CheckoutTest.java ===============
package shop;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;

class CheckoutTest {
    WebDriver driver;

    @BeforeEach void setUp() {
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    }

    @Test void paysWithCard() throws Exception {
        driver.get("https://shop.example.test/checkout");
        driver.findElement(By.xpath("//payment-form//input[@name='card-number']")).sendKeys("4000000000003220");
        driver.findElement(By.id("pay")).click();
        Thread.sleep(5000);
        driver.findElement(By.id("challenge-complete")).click();     // inside the 3-D Secure iframe
        driver.findElement(By.linkText("Open receipt")).click();      // opens a new tab
        Assertions.assertTrue(driver.findElement(By.cssSelector("h1")).getText().contains("Receipt"));
    }

    @AfterEach void tearDown() { driver.quit(); }
}

=============== FILE: docs/page-structure.md ===============
- The card fields live in a `<payment-form>` custom element with an open shadow root.
- The 3-D Secure challenge loads in `<iframe id="threeds-frame">` a few seconds after Pay.
- "Open receipt" opens the receipt in a new tab.
