# The invoice test fails on Grid at the upload and download steps

## Problem Description

Our invoice test passes locally but fails on Selenium Grid at the upload and the download steps (`InvoiceTest.java`, `docker-compose.grid.yml`, `ci-log.txt`). Fix it for the Grid.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/test/java/com/acme/InvoiceTest.java ===============
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

=============== FILE: docker-compose.grid.yml ===============
services:
  hub:
    image: selenium/hub:4.27.0
    ports: ["4442:4442", "4443:4443", "4444:4444"]
  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: 2gb
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443

=============== FILE: ci-log.txt ===============
InvoiceTest > uploadsCsvAndDownloadsPdf() FAILED
    org.openqa.selenium.InvalidArgumentException: invalid argument: File not found : /builds/acme/app/src/test/resources/invoices.csv
(after hard-coding a path that exists on the node, the upload works but then:)
    org.opentest4j.AssertionFailedError: expected: <true> but was: <false>   (InvoiceTest.java:31)
Locally with ChromeDriver both steps pass.
