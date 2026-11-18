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
