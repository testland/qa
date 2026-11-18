package com.acme;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.*;

public abstract class BaseTest {
  protected WebDriver driver;

  @BeforeEach
  void start() {
    System.setProperty("webdriver.chrome.driver", "/opt/drivers/chromedriver");  // pinned 128 in the CI image
    WebDriverManager.chromedriver().setup();
    ChromeOptions o = new ChromeOptions();
    o.addArguments("--headless=new");
    driver = new ChromeDriver(o);
  }

  @AfterEach
  void stop() { driver.quit(); }
}
