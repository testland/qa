package com.shop.e2e;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

class CheckoutFlow {

    private WebDriver driver;
    private WebDriverWait wait;
    private static final String BASE = System.getProperty("baseUrl", "http://localhost:3000");

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
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=order-confirmation]")));
        Assertions.assertTrue(driver.getCurrentUrl().contains("/orders/"));
    }
}
