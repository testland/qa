package com.atlas.e2e;

import com.atlas.e2e.support.Browser;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public abstract class BaseTest {

    public static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

    protected WebDriver driver;
    protected WebDriverWait wait;

    @BeforeEach
    void startBrowser() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1440,900");
        driver = Browser.create(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void stopBrowser() {
        driver.quit();
    }
}
