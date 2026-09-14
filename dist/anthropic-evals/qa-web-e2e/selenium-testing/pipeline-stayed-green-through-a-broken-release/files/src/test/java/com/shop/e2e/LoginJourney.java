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
