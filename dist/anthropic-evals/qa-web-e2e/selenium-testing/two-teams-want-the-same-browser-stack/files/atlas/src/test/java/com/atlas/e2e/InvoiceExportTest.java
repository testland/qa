package com.atlas.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

class InvoiceExportTest {

    private static final Path DOWNLOADS = Paths.get("target/downloads");

    @Test
    void exportsTheQuarterToCsv() throws Exception {
        // its own browser: this one needs a download directory the others do not want
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("download.default_directory", DOWNLOADS.toAbsolutePath().toString());
        options.setExperimentalOption("prefs", prefs);

        WebDriver driver = new ChromeDriver(options);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));

        driver.get(BaseTest.BASE + "/billing/invoices");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=export-invoices]"))).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=export-ready]")));

        Path csv = DOWNLOADS.resolve("invoices-2026-Q2.csv");
        Assertions.assertTrue(Files.exists(csv), "export did not land on disk");
        Assertions.assertTrue(Files.readString(csv).startsWith("invoice_id,"));

        driver.quit();
    }
}
