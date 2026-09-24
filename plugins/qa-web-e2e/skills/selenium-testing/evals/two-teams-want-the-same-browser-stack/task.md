# Two teams want onto the one grid before the freeze on the 26th

## Problem Description

I run platform engineering. We stood up a browser grid in July — hub plus a
Chrome node and a Firefox node, on `ci-grid-01.internal`, which is not one of the
build runners. The compose file is attached. The point of it was to stop every
team standing up their own browsers on their own runners, and two teams now want
on it before the change freeze on the 26th.

**Atlas** is the internal admin console. Java, 60 tests, each one currently
starting a browser on the build runner itself. Their lead sent me the change on
Tuesday and called it a one-liner: swap the bit that constructs the browser for
the remote equivalent and point it at the hub. Nothing else changes. He says they
tried it from a laptop on Wednesday and the dashboard tests passed, and he wants
sign-off to merge on Friday so it is in before the freeze. His note, their CI
file, the factory he is changing and three of their tests are all attached. I am
inclined to say yes — it is one line and I have eleven other things on — but I
would rather someone who knows this properly looked at it before I sign it.

**Beacon** is the nine-year-old Rails monolith that pays for everything else.
About 400 browser specs in Ruby, and a government customer whose contract carries
a clause about how automated test evidence gets produced. The excerpt is
attached, along with the note legal wrote the last time anybody asked them about
it. Their tech lead is on leave until the 29th, which is after the freeze. I want
a yes or a no from you today so I can put it in Monday's mail and stop thinking
about it.

## Output Specification

1. Make whatever changes Atlas's files need for the move to work, in place. If
   the change as proposed should not be merged on Friday, say so plainly and say
   what has to be true first.
2. Write `docs/grid-onboarding.md`: the call on Atlas with each thing that had to
   change and why; the call on Beacon; and the check you would run against the
   grid before anybody's first run on it.
3. Do not modify `beacon/spec/spec_helper.rb`.

## Input Files

Extract the following files before beginning.

=============== FILE: grid/docker-compose.grid.yml ===============
# Brought up on ci-grid-01.internal by platform. Build runners are separate hosts.
services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports: ["4444:4444"]
    networks: [gridnet]

  chrome-node:
    image: selenium/node-chrome:4.27.0
    depends_on: [selenium-hub]
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
    networks: [gridnet]

  firefox-node:
    image: selenium/node-firefox:4.27.0
    depends_on: [selenium-hub]
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
    networks: [gridnet]

networks:
  gridnet:

=============== FILE: atlas/docs/proposed-change.md ===============
# What we want to merge on Friday

One line, in `support/Browser.java`:

```diff
-        return new ChromeDriver(options);
+        return new RemoteWebDriver(new URL("http://ci-grid-01.internal:4444"), options);
```

That is the whole change. Same 60 tests, same CI file, same everything else.

Evidence it works: I ran the suite from my laptop on Wednesday afternoon with
`-DbaseUrl=https://atlas-staging.internal` and the two dashboard tests came back
green off the grid in 14 seconds, which is quicker than they run locally.

— Tomás, Atlas

=============== FILE: atlas/pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.atlas</groupId>
  <artifactId>atlas-e2e</artifactId>
  <version>2.3.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>4.27.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: atlas/.github/workflows/e2e.yml ===============
name: atlas-e2e

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: [self-hosted, build-runner]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: start the app on this runner
        run: docker compose -f docker-compose.app.yml up -d --wait
      - name: run the suite
        run: mvn -B test -DbaseUrl=http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: surefire-reports
          path: target/surefire-reports/

=============== FILE: atlas/src/test/java/com/atlas/e2e/support/Browser.java ===============
package com.atlas.e2e.support;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public final class Browser {

    private Browser() {
    }

    public static WebDriver create(ChromeOptions options) {
        return new ChromeDriver(options);
    }
}

=============== FILE: atlas/src/test/java/com/atlas/e2e/BaseTest.java ===============
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

=============== FILE: atlas/src/test/java/com/atlas/e2e/DashboardTest.java ===============
package com.atlas.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

class DashboardTest extends BaseTest {

    @Test
    void showsTheOpenTicketCount() {
        driver.get(BASE + "/dashboard");
        WebElement count = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=open-tickets]")));
        Assertions.assertEquals("17", count.getText());
    }

    @Test
    void filtersTicketsByQueue() {
        driver.get(BASE + "/dashboard");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=queue-billing]"))).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector("[data-testid=result-count]"), "4 tickets"));
    }
}

=============== FILE: atlas/src/test/java/com/atlas/e2e/ReceiptUploadTest.java ===============
package com.atlas.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.nio.file.Paths;

class ReceiptUploadTest extends BaseTest {

    @Test
    void attachesAReceiptToAnExpense() {
        driver.get(BASE + "/expenses/new");
        driver.findElement(By.cssSelector("[data-testid=amount]")).sendKeys("42.00");

        driver.findElement(By.cssSelector("input[type=file]"))
              .sendKeys(Paths.get("src/test/resources/fixtures/receipt.pdf")
                             .toAbsolutePath().toString());

        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=attachment-name]")));
        Assertions.assertEquals("receipt.pdf",
                driver.findElement(By.cssSelector("[data-testid=attachment-name]")).getText());
    }
}

=============== FILE: atlas/src/test/java/com/atlas/e2e/InvoiceExportTest.java ===============
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

=============== FILE: beacon/docs/contract-excerpt.md ===============
# Excerpt — Schedule 4, Testing and Assurance

Customer: (redacted, public sector). In force to 2029-03-31.

> **7.4 Test evidence.** Automated browser verification evidence submitted under
> this Schedule shall be produced by tooling conformant with the W3C WebDriver
> specification. The Supplier shall be able to demonstrate protocol conformance on
> request, and shall notify the Customer in writing at least ninety (90) days
> before any change to the tooling used to produce such evidence.

Note from legal, 2026-05-14. The question we were asked then was whether 7.4
constrains which framework Beacon writes its specs in. It does, and the
customer's own assurance team asked for the protocol to be named in the clause.

Nobody has put a different question to them — where the browsers actually run —
and I have no view on whether that falls inside "a change to the tooling used to
produce such evidence" as 7.4 means it. If it does, ninety days is a hard number
and the notice period has never been shortened on request.

=============== FILE: beacon/spec/spec_helper.rb ===============
require 'selenium-webdriver'
require 'rspec'

BASE_URL = ENV.fetch('BASE_URL', 'http://localhost:3000')

module DriverSupport
  def build_driver
    options = Selenium::WebDriver::Chrome::Options.new
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1440,900')
    Selenium::WebDriver.for(:chrome, options: options)
  end

  def wait
    @wait ||= Selenium::WebDriver::Wait.new(timeout: 10)
  end

  def sign_in(email: 'ops@beacon.example', password: 'test-password')
    @driver.navigate.to "#{BASE_URL}/login"
    @driver.find_element(css: '[data-testid=email]').send_keys(email)
    @driver.find_element(css: '[data-testid=password]').send_keys(password)
    @driver.find_element(css: 'button[type=submit]').click
    wait.until { @driver.find_element(css: '[data-testid=account-menu]').displayed? }
  end
end

RSpec.configure do |config|
  config.include DriverSupport
  config.formatter = :junit
  config.add_formatter('RspecJunitFormatter', 'tmp/rspec/results.xml')
end
