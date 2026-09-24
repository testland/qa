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
