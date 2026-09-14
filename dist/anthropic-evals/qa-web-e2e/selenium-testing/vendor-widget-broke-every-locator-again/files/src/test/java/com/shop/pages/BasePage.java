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
