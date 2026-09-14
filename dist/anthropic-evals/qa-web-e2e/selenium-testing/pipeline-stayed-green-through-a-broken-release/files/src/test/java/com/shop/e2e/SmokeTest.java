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
