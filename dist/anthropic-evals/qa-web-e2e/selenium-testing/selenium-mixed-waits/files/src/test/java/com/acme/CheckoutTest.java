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
