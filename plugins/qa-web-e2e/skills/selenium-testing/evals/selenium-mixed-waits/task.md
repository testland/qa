# Fix the flaky waits in the checkout test

## Problem Description

Fix the flaky waits in `CheckoutTest.java` (`notes.md`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/test/java/com/acme/CheckoutTest.java ===============
package com.acme;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

class CheckoutTest {
    static final String BASE = System.getenv().getOrDefault("BASE_URL", "http://localhost:8080");
    WebDriver driver;
    WebDriverWait wait;

    @BeforeEach void setUp() {
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        wait = new WebDriverWait(driver, Duration.ofSeconds(5));
    }

    @AfterEach void tearDown() { driver.quit(); }

    @Test void appliesCoupon() {
        driver.get(BASE + "/cart");
        WebElement total = driver.findElement(By.id("total"));
        driver.findElement(By.id("coupon")).sendKeys("SAVE10");
        driver.findElement(By.id("apply")).click();
        wait.until(ExpectedConditions.invisibilityOf(driver.findElement(By.cssSelector(".spinner"))));
        assertEquals("$90.00", total.getText());
    }
}

=============== FILE: notes.md ===============
- Sometimes the test takes 40+ seconds and fails with TimeoutException although the spinner is gone.
- Sometimes it fails with NoSuchElementException for `.spinner` when the spinner was very quick.
- Sometimes StaleElementReferenceException on `total.getText()`: the cart re-renders the summary
  after a coupon is applied.
