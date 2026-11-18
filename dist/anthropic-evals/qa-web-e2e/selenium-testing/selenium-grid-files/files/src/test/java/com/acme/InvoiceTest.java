package com.acme;

import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import java.net.URL;
import java.nio.file.*;
import java.util.Map;

class InvoiceTest {
  WebDriver driver;

  @BeforeEach
  void start() throws Exception {
    ChromeOptions o = new ChromeOptions();
    o.setExperimentalOption("prefs", Map.of("download.default_directory", "/tmp/downloads"));
    driver = new RemoteWebDriver(new URL(System.getenv("GRID_URL")), o);
  }

  @Test
  void uploadsCsvAndDownloadsPdf() throws Exception {
    driver.get(System.getenv("APP_URL") + "/invoices/import");
    driver.findElement(By.id("csv")).sendKeys(Paths.get("src/test/resources/invoices.csv").toAbsolutePath().toString());
    driver.findElement(By.id("import")).click();
    driver.findElement(By.id("download-pdf")).click();
    Thread.sleep(3000);
    Assertions.assertTrue(Files.exists(Path.of("/tmp/downloads/invoice-2026-11.pdf")));
  }

  @AfterEach
  void stop() { driver.quit(); }
}
